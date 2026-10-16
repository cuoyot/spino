package com.miguecoll.spino;

import android.accounts.Account;
import android.app.Activity;
import android.content.SharedPreferences;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.android.gms.auth.api.identity.*;
import com.google.android.gms.common.api.Scope;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Drive notebook transport. OAuth tokens never leave native memory. */
@CapacitorPlugin(name="DriveNotebook")
public class DriveNotebookPlugin extends Plugin {
    private static final String SCOPE="https://www.googleapis.com/auth/drive.file";
    private static final int LIMIT=60000000;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile PluginCall pending;
    private ActivityResultLauncher<IntentSenderRequest> authorization;
    private SharedPreferences preferences(){return getContext().getSharedPreferences("spino-drive-account",0);}
    @Override public void load(){
        authorization=bridge.registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(),result->{
            PluginCall call=pending;if(call==null)return;
            if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null){pending=null;call.reject("Google Drive connection cancelled.","CANCELLED");return;}
            try{finishConnect(call,Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData()));}
            catch(Exception error){pending=null;call.reject("Google authorization could not complete. Try connecting again.","AUTHORIZATION");}
        });
    }
    private JSObject account(){return new JSObject().put("id",preferences().getString("id","")).put("email",preferences().getString("email","")).put("name",preferences().getString("name",""));}
    @PluginMethod public void status(PluginCall call){call.resolve(new JSObject().put("account",account()));}
    private AuthorizationRequest authorizationRequest(boolean interactive){
        AuthorizationRequest.Builder request=AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope(SCOPE)));
        String email=preferences().getString("email","");
        if(!email.isEmpty())request.setAccount(new Account(email,"com.google"));
        else if(interactive)request.setPrompt(AuthorizationRequest.Prompt.SELECT_ACCOUNT);
        return request.build();
    }
    @PluginMethod public synchronized void connect(PluginCall call){
        if(pending!=null){call.reject("A Google connection is already pending.","BUSY");return;}
        pending=call;
        getActivity().runOnUiThread(()->Identity.getAuthorizationClient(getActivity()).authorize(authorizationRequest(true))
            .addOnSuccessListener(result->{if(result.hasResolution())authorization.launch(new IntentSenderRequest.Builder(result.getPendingIntent().getIntentSender()).build());else finishConnect(call,result);})
            .addOnFailureListener(error->{pending=null;call.reject("Google authorization failed. Reconnect your Google account.","AUTHORIZATION");}));
    }
    private void finishConnect(PluginCall call,AuthorizationResult result){
        if(!DriveMediaPlugin.hasDrivePermission(result)){pending=null;call.reject("Google Drive permission was not granted.","PERMISSION_REQUIRED");return;}
        final String token=result.getAccessToken();
        worker.execute(()->{try{
            JSObject response=fetch("/drive/v3/about?fields=user(permissionId,displayName,emailAddress)","GET",token,null,null);
            if(response.getInteger("status",0)!=200)throw new IOException();
            JSONObject user=new JSONObject(response.getString("text")).getJSONObject("user");
            String id=user.getString("permissionId"),previous=preferences().getString("id","");
            if(!previous.isEmpty()&&!previous.equals(id)){call.reject("Reconnect the same Google account. Disconnect before changing accounts.","ACCOUNT_MISMATCH");return;}
            if(!preferences().edit().putString("id",id).putString("email",user.getString("emailAddress")).putString("name",user.optString("displayName")).commit())throw new IOException();
            call.resolve(account());
        }catch(Exception error){call.reject("Could not identify your Google Drive account. Try connecting again.","CONNECTION");}finally{pending=null;}});
    }
    static boolean validPath(String path){
        if(path==null||path.contains("\r")||path.contains("\n"))return false;
        try{URI uri=new URI(path);return !uri.isAbsolute()&&uri.getRawAuthority()==null&&uri.getFragment()==null&&
            uri.getPath().matches("/(upload/)?drive/v3/(files(/[a-zA-Z0-9_-]{1,180})?|about)")&&!uri.getPath().contains("..");}
        catch(Exception error){return false;}
    }
    private byte[] read(InputStream input)throws IOException{
        if(input==null)return new byte[0];try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>LIMIT)throw new IOException("The notebook exceeds 60 MB.");out.write(buffer,0,n);}return out.toByteArray();}
    }
    private JSObject fetch(String path,String method,String token,String text,String etag)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL("https://www.googleapis.com"+path).openConnection();
        try{
            c.setConnectTimeout(20000);c.setReadTimeout(120000);c.setInstanceFollowRedirects(false);c.setRequestMethod(method);
            c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Accept","application/json");
            if(etag!=null){if(!etag.matches("\"[^\"\\r\\n]+\""))throw new IOException("Invalid Drive revision.");c.setRequestProperty("If-Match",etag);}
            if(text!=null){byte[] body=text.getBytes(StandardCharsets.UTF_8);if(body.length>LIMIT)throw new IOException("The notebook exceeds 60 MB.");c.setRequestProperty("Content-Type","application/json; charset=UTF-8");c.setDoOutput(true);c.setFixedLengthStreamingMode(body.length);try(OutputStream out=c.getOutputStream()){out.write(body);}}
            int status=c.getResponseCode();
            if(status==401)Identity.getAuthorizationClient(getActivity()).clearToken(ClearTokenRequest.builder().setToken(token).build());
            String body=new String(read(status>=400?c.getErrorStream():c.getInputStream()),StandardCharsets.UTF_8);
            return new JSObject().put("status",status).put("text",body).put("etag",c.getHeaderField("ETag"));
        }finally{c.disconnect();}
    }
    @PluginMethod public void request(PluginCall call){
        String path=call.getString("path"),method=call.getString("method","GET");
        if(!validPath(path)||!method.matches("GET|POST|PATCH")){call.reject("Invalid Google Drive request.","INVALID_REQUEST");return;}
        String accountId=preferences().getString("id","");
        if(accountId.isEmpty()||!accountId.equals(call.getString("accountId"))){call.reject("Reconnect the same Google Drive account.","PERMISSION_REQUIRED");return;}
        // Silent renewal never launches consent from an automatic sync timer.
        getActivity().runOnUiThread(()->Identity.getAuthorizationClient(getActivity()).authorize(authorizationRequest(false))
            .addOnSuccessListener(result->{
                if(result.hasResolution()||!DriveMediaPlugin.hasDrivePermission(result)){call.reject("Reconnect Google Drive to renew permission. Your notebook is saved locally.","PERMISSION_REQUIRED");return;}
                final String token=result.getAccessToken();
                worker.execute(()->{try{
                    if(!accountId.equals(preferences().getString("id","")))throw new IOException();
                    call.resolve(fetch(path,method,token,call.getString("text"),call.getString("etag")));
                }catch(Exception error){call.reject("Google Drive is unavailable. Your notebook is saved locally; reconnect or retry later.","PROVIDER_ERROR");}});
            }).addOnFailureListener(error->call.reject("Reconnect Google Drive. Your notebook is saved locally.","PERMISSION_REQUIRED")));
    }
    @PluginMethod public void disconnect(PluginCall call){
        if(pending!=null){call.reject("Wait for the Google connection to finish.","BUSY");return;}
        worker.execute(()->{if(preferences().edit().clear().commit())call.resolve();else call.reject("Could not disconnect Google Drive.");});
    }
    @Override protected void handleOnDestroy(){worker.shutdownNow();}
}
