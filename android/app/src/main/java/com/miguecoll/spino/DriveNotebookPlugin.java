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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** Drive notebook transport. OAuth tokens never leave native memory. */
@CapacitorPlugin(name="DriveNotebook")
public class DriveNotebookPlugin extends Plugin {
    private static final String SCOPE="https://www.googleapis.com/auth/drive.file";
    private static final int LIMIT=60000000;
    private final ExecutorService worker=Executors.newFixedThreadPool(4);
    private final ScheduledExecutorService deadlines=Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<String,Request> requests=new ConcurrentHashMap<>();
    private final class Request {
        final String id; final PluginCall call; final AtomicBoolean finished=new AtomicBoolean();
        volatile HttpURLConnection connection; volatile Future<?> work;
        volatile ScheduledFuture<?> authDeadline,totalDeadline;
        Request(String id,PluginCall call){this.id=id;this.call=call;}
        boolean finish(){
            if(!finished.compareAndSet(false,true))return false;
            if(authDeadline!=null)authDeadline.cancel(false);
            if(totalDeadline!=null)totalDeadline.cancel(false);
            requests.remove(id,this);return true;
        }
        void fail(String message,String code){
            if(!finish())return;
            call.reject(message,code);
            if(work!=null)work.cancel(true);
            HttpURLConnection c=connection;if(c!=null)c.disconnect();
        }
        void resolve(JSObject result){if(finish())call.resolve(result);}
    }
    private volatile PluginCall pending;
    private ActivityResultLauncher<IntentSenderRequest> authorization;
    private SharedPreferences preferences(){return getContext().getSharedPreferences("spino-drive-account",0);}
    @Override public void load(){
        authorization=bridge.registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(),result->{
            PluginCall call=pending;if(call==null)return;
            // Even RESULT_CANCELED can carry Google's diagnostic status. Parse it before
            // reporting an incomplete flow; Android's result alone does not prove user cancellation.
            try{
                if(result.getData()==null){rejectAuthorization(call,"RESULT",result.getResultCode(),null);return;}
                AuthorizationResult granted=Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData());
                if(result.getResultCode()!=Activity.RESULT_OK){rejectAuthorization(call,"RESULT",result.getResultCode(),null);return;}
                finishConnect(call,granted);
            }catch(Exception error){rejectAuthorization(call,"RESULT",result.getResultCode(),error);}
        });
    }
    private void rejectAuthorization(PluginCall call,String stage,Integer activityResult,Exception error){
        pending=null;
        call.reject(DriveAuthorizationDiagnostic.message(stage,activityResult,error,getContext().getPackageName()),"AUTHORIZATION");
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
            .addOnSuccessListener(result->{try{if(result.hasResolution())authorization.launch(new IntentSenderRequest.Builder(result.getPendingIntent().getIntentSender()).build());else finishConnect(call,result);}catch(Exception error){rejectAuthorization(call,"LAUNCH",null,error);}})
            .addOnFailureListener(error->rejectAuthorization(call,"REQUEST",null,error)));
    }
    private void finishConnect(PluginCall call,AuthorizationResult result){
        if(!DriveMediaPlugin.hasDrivePermission(result)){pending=null;call.reject(DriveAuthorizationDiagnostic.message("PERMISSION",null,null,getContext().getPackageName()),"PERMISSION_REQUIRED");return;}
        final String token=result.getAccessToken();
        worker.execute(()->{try{
            JSObject response=fetch("/drive/v3/about?fields=user(permissionId,displayName,emailAddress)","GET",token,null,null,null);
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
            (uri.getPath().matches("/(upload/)?drive/v3/(files(/[a-zA-Z0-9_-]{1,180})?|about)")||uri.getPath().matches("/(upload/)?drive/v2/files/[a-zA-Z0-9_-]{1,180}")||uri.getPath().matches("/drive/v3/changes(/startPageToken)?"))&&!uri.getPath().contains("..");}
        catch(Exception error){return false;}
    }
    static boolean validContentType(String value){return value==null||value.matches("multipart/related; boundary=spino_[a-f0-9]{32}");}
    private byte[] read(InputStream input)throws IOException{
        if(input==null)return new byte[0];try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>LIMIT)throw new IOException("The notebook exceeds 60 MB.");out.write(buffer,0,n);}return out.toByteArray();}
    }
    private JSObject fetch(String path,String method,String token,String text,String etag,String contentType)throws Exception{return fetch(path,method,token,text,etag,contentType,null);}
    private JSObject fetch(String path,String method,String token,String text,String etag,String contentType,Request request)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL("https://www.googleapis.com"+path).openConnection();
        try{
            if(request!=null){request.connection=c;if(request.finished.get())throw new IOException("Request cancelled.");}
            c.setConnectTimeout(10000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);c.setUseCaches(false);c.setRequestMethod(method);
            c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Accept","application/json");
            if(etag!=null){if(!etag.matches("\"[^\"\\r\\n]+\""))throw new IOException("Invalid Drive revision.");c.setRequestProperty("If-Match",etag);}
            if(text!=null){byte[] body=text.getBytes(StandardCharsets.UTF_8);if(body.length>LIMIT)throw new IOException("The notebook exceeds 60 MB.");c.setRequestProperty("Content-Type",contentType==null?"application/json; charset=UTF-8":contentType);c.setDoOutput(true);c.setFixedLengthStreamingMode(body.length);try(OutputStream out=c.getOutputStream()){out.write(body);}}
            int status=c.getResponseCode();
            if(status==401){Identity.getAuthorizationClient(getActivity()).clearToken(ClearTokenRequest.builder().setToken(token).build());}
            String body=new String(read(status>=400?c.getErrorStream():c.getInputStream()),StandardCharsets.UTF_8);
            return new JSObject().put("status",status).put("text",body).put("etag",c.getHeaderField("ETag"));
        }finally{c.disconnect();}
    }
    @PluginMethod public void request(PluginCall call){
        String path=call.getString("path"),method=call.getString("method","GET"),contentType=call.getString("contentType");
        if(!validContentType(contentType)){call.reject("Invalid notebook request content type.","INVALID_REQUEST");return;}
        if(!validPath(path)||!method.matches("GET|POST|PATCH|PUT")){call.reject("Invalid Google Drive request.","INVALID_REQUEST");return;}
        String accountId=preferences().getString("id","");
        if(accountId.isEmpty()||!accountId.equals(call.getString("accountId"))){call.reject("Reconnect the same Google Drive account.","PERMISSION_REQUIRED");return;}
        String requestId=call.getString("requestId",UUID.randomUUID().toString());
        if(!requestId.matches("[a-zA-Z0-9_-]{1,100}")){call.reject("Invalid Drive request identity.","INVALID_REQUEST");return;}
        Request request=new Request(requestId,call);
        if(requests.putIfAbsent(requestId,request)!=null){call.reject("This Drive request is already pending.","BUSY");return;}
        request.totalDeadline=deadlines.schedule(()->request.fail("The Drive notebook transfer timed out. Pending changes are kept for retry.","PROVIDER_ERROR"),50,TimeUnit.SECONDS);
        request.authDeadline=deadlines.schedule(()->request.fail("Google Drive did not respond in time. Pending changes are kept. Retry synchronization.","PROVIDER_ERROR"),20,TimeUnit.SECONDS);
        // Silent renewal never launches consent from an automatic sync timer.
        getActivity().runOnUiThread(()->{if(request.finished.get())return;Identity.getAuthorizationClient(getActivity()).authorize(authorizationRequest(false))
            .addOnSuccessListener(result->{
                if(request.finished.get())return;
                if(result.hasResolution()||!DriveMediaPlugin.hasDrivePermission(result)){request.fail("Reconnect Google Drive to renew permission. Your notebook is saved locally.","PERMISSION_REQUIRED");return;}
                final String token=result.getAccessToken();
                if(token==null||token.isEmpty()){request.fail("Reconnect Google Drive. Your notebook is saved locally.","PERMISSION_REQUIRED");return;}
                if(!accountId.equals(preferences().getString("id",""))){request.fail("Reconnect the same Google Drive account.","ACCOUNT_MISMATCH");return;}
                transfer(request,path,method,token,contentType,accountId);
            }).addOnFailureListener(error->request.fail("Reconnect Google Drive. Your notebook is saved locally.","PERMISSION_REQUIRED"));});
    }
    private void transfer(Request request,String path,String method,String token,String contentType,String accountId){
        if(request.authDeadline!=null)request.authDeadline.cancel(false);
        if(request.finished.get())return;
        request.work=worker.submit(()->{try{
            if(request.finished.get())return;
            if(!accountId.equals(preferences().getString("id","")))throw new IOException();
            request.resolve(fetch(path,method,token,request.call.getString("text"),request.call.getString("etag"),contentType,request));
        }catch(java.net.SocketTimeoutException error){request.fail("The Drive notebook transfer timed out. Pending changes are kept for retry.","PROVIDER_ERROR");}
        catch(java.net.UnknownHostException error){request.fail("The Drive server could not be reached. Check the connection and retry.","PROVIDER_ERROR");}
        catch(Exception error){request.fail("The Drive notebook request failed ("+error.getClass().getSimpleName()+"). Your local notebook is kept.","PROVIDER_ERROR");}});
        if(request.finished.get())request.work.cancel(true);
    }
    @PluginMethod public void cancel(PluginCall call){
        Request request=requests.get(call.getString("requestId",""));
        if(request!=null)request.fail("Synchronization paused. Pending changes are kept.","CANCELLED");
        call.resolve();
    }
    @PluginMethod public void disconnect(PluginCall call){
        if(pending!=null){call.reject("Wait for the Google connection to finish.","BUSY");return;}
        worker.execute(()->{if(preferences().edit().clear().commit())call.resolve();else call.reject("Could not disconnect Google Drive.");});
    }
    @Override protected void handleOnDestroy(){for(Request request:requests.values())request.fail("Synchronization paused. Pending changes are kept.","CANCELLED");deadlines.shutdownNow();worker.shutdownNow();}
}
