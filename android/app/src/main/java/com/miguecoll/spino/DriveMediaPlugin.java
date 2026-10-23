package com.miguecoll.spino;

import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Bounded, resumable recording copies using the notebook account. Tokens remain native. */
@CapacitorPlugin(name="DriveMedia")
public class DriveMediaPlugin extends Plugin {
    private static final String SCOPE="https://www.googleapis.com/auth/drive.file";
    private static final long LIMIT=250L*1024*1024;
    private static final int CHUNK=256*1024;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile String token=null, accountId=null;
    private volatile HttpURLConnection activeConnection;
    private volatile boolean paused=false,wifiOnly=true;
    @PluginMethod public void useNotebookAccount(PluginCall call){
        String selected=call.getString("accountId","");
        android.content.SharedPreferences prefs=getContext().getSharedPreferences("spino-drive-account",0);
        String email=prefs.getString("email","");
        if(selected.isEmpty()||!selected.equals(prefs.getString("id",""))||email.isEmpty()){call.reject("Connect the same Google Drive account first.","PERMISSION_REQUIRED");return;}
        getActivity().runOnUiThread(()->Identity.getAuthorizationClient(getActivity()).authorize(AuthorizationRequest.builder().setAccount(new android.accounts.Account(email,"com.google")).setRequestedScopes(Collections.singletonList(new Scope(SCOPE))).build())
          .addOnSuccessListener(result->{
            if(result.hasResolution()||!hasDrivePermission(result)||!selected.equals(prefs.getString("id",""))){call.reject("Reconnect Google Drive to copy recordings. Local recordings are kept.","PERMISSION_REQUIRED");return;}
            token=result.getAccessToken();accountId=selected;wifiOnly=call.getBoolean("wifiOnly",true);paused=false;call.resolve();
          }).addOnFailureListener(error->call.reject("Reconnect Google Drive to copy recordings. Local recordings are kept.","PERMISSION_REQUIRED")));
    }
    @PluginMethod public void pause(PluginCall call){paused=true;HttpURLConnection active=activeConnection;if(active!=null)active.disconnect();call.resolve();}
    private File directory(){File dir=new File(getContext().getCacheDir(),"spino-drive-media");dir.mkdirs();return dir;}
    private File file(String name)throws IOException{if(name==null||!name.matches("[a-zA-Z0-9_.-]{1,200}")||name.contains(".."))throw new IOException("Invalid transfer file.");return new File(directory(),name);}
    private long integer(PluginCall call,String name)throws IOException{
        Object value=call.getData().opt(name);
        if(!(value instanceof Number))throw new IOException("Missing numeric transfer field.");
        Number n=(Number)value;long whole=n.longValue();if(!Double.isFinite(n.doubleValue())||n.doubleValue()!=whole)throw new IOException("Invalid numeric transfer field.");return whole;
    }
    private String hash(File file)throws Exception{
        MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream input=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1)digest.update(buffer,0,n);}
        StringBuilder out=new StringBuilder();for(byte b:digest.digest())out.append(String.format("%02x",b&255));return out.toString();
    }
    private URL endpoint(String value)throws Exception{
        URI uri=new URI(value);
        if(!"https".equals(uri.getScheme())||!"www.googleapis.com".equals(uri.getHost())||uri.getPort()!=-1||uri.getUserInfo()!=null||uri.getFragment()!=null||!uri.getPath().matches("/(upload/)?drive/v3/files(/[a-zA-Z0-9_-]{1,160})?"))throw new IOException("Invalid Drive endpoint.");return uri.toURL();
    }
    private android.net.Network network()throws IOException{
        android.net.ConnectivityManager manager=(android.net.ConnectivityManager)getContext().getSystemService(android.content.Context.CONNECTIVITY_SERVICE);
        android.net.Network active=manager.getActiveNetwork();android.net.NetworkCapabilities caps=manager.getNetworkCapabilities(active);
        if(caps==null||!caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)||wifiOnly&&(!caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)||!caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_NOT_METERED)))throw new IOException("Recording copies are waiting for the allowed network.");return active;
    }
    private HttpURLConnection connection(String url,String method,String access)throws Exception{
        if(paused)throw new IOException("Recording copies are paused.");HttpURLConnection c=(HttpURLConnection)network().openConnection(endpoint(url));activeConnection=c;c.setConnectTimeout(20000);c.setReadTimeout(60000);c.setInstanceFollowRedirects(false);c.setRequestMethod(method);c.setRequestProperty("Authorization","Bearer "+access);return c;
    }
    private String access(PluginCall call)throws IOException{
        if(paused||token==null||accountId==null||!accountId.equals(call.getString("accountId"))||!accountId.equals(getContext().getSharedPreferences("spino-drive-account",0).getString("id","")))throw new IOException("Reconnect the same Google Drive account.");return token;
    }
    private byte[] read(InputStream input,int limit)throws IOException{
        if(input==null)return new byte[0];try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>limit)throw new IOException("Drive response exceeds the transfer limit.");out.write(b,0,n);}return out.toByteArray();}
    }
    static boolean hasDrivePermission(AuthorizationResult result){
        // AuthorizationResult returns scope URI strings, unlike AuthorizationRequest's Scope objects.
        return result.getAccessToken()!=null&&!result.getAccessToken().isEmpty()&&result.getGrantedScopes().contains(SCOPE);
    }
    @PluginMethod public void request(PluginCall call){
        worker.execute(()->{HttpURLConnection c=null;try{
            String access=access(call),method=call.getString("method","GET");
            if(!method.matches("GET|POST|PUT|PATCH"))throw new IOException("Unsupported Drive method.");
            c=connection(call.getString("url"),method,access);
            JSObject headers=call.getObject("headers",new JSObject());Iterator<String> names=headers.keys();
            while(names.hasNext()){String name=names.next();if(!name.matches("(?i)Content-Type|Content-Range|X-Upload-Content-Type|X-Upload-Content-Length|Range"))throw new IOException("Unsupported Drive header.");c.setRequestProperty(name,headers.getString(name));}
            String fileKey=call.getString("fileKey");JSObject json=call.getObject("json");
            if(fileKey!=null){
                if(!fileKey.matches("[a-f0-9]{64}"))throw new IOException("Invalid transfer source.");
                File source=file(fileKey+".source");long offset=integer(call,"offset"),requestedLength=integer(call,"length");
                if(offset<0||requestedLength<1||requestedLength>CHUNK||offset>source.length()-requestedLength)throw new IOException("Invalid transfer chunk range.");int length=(int)requestedLength;
                c.setDoOutput(true);c.setFixedLengthStreamingMode(length);
                try(RandomAccessFile input=new RandomAccessFile(source,"r");OutputStream output=c.getOutputStream()){input.seek(offset);byte[] buffer=new byte[32768];int left=length;while(left>0){int n=input.read(buffer,0,Math.min(left,buffer.length));if(n<0)throw new EOFException();output.write(buffer,0,n);left-=n;}}
            }else if(json!=null){byte[] body=json.toString().getBytes(StandardCharsets.UTF_8);if(body.length>65536)throw new IOException("Drive metadata too large.");c.setRequestProperty("Content-Type","application/json; charset=UTF-8");c.setDoOutput(true);c.setFixedLengthStreamingMode(body.length);try(OutputStream out=c.getOutputStream()){out.write(body);}}
            else if(method.equals("PUT")){c.setDoOutput(true);c.setFixedLengthStreamingMode(0);try(OutputStream out=c.getOutputStream()){} }
            int status=c.getResponseCode();
            if(status==401){token=null;Identity.getAuthorizationClient(getActivity()).clearToken(ClearTokenRequest.builder().setToken(access).build());}
            JSObject responseHeaders=new JSObject();for(String name:new String[]{"Location","Range","Content-Range"}){String value=c.getHeaderField(name);if(value!=null){if(name.equals("Location"))endpoint(value);responseHeaders.put(name.toLowerCase(java.util.Locale.ROOT),value);}}
            byte[] bytes=read(status>=400?c.getErrorStream():c.getInputStream(),1024*1024);
            JSObject response=new JSObject().put("status",status).put("headers",responseHeaders);
            if(bytes.length>0&&status>=200&&status<300)response.put("json",new JSObject(new String(bytes,StandardCharsets.UTF_8)));
            call.resolve(response);
        }catch(Exception error){call.reject("Drive request could not complete. Reconnect or retry; local recordings are retained.","TRANSFER");}finally{if(c!=null)c.disconnect();}});
    }
    @PluginMethod public void stageChunk(PluginCall call){
        worker.execute(()->{try{
            String key=call.getString("key"),encoded=call.getString("base64","");long total=integer(call,"total"),offset=integer(call,"offset");
            if(key==null||!key.matches("[a-zA-Z0-9-]{1,80}")||total<1||total>LIMIT||offset<0||encoded.length()>4*((CHUNK+2)/3))throw new IOException("Invalid staging request.");
            byte[] data=Base64.decode(encoded,Base64.NO_WRAP);File staged=file(key+".stage");
            if(data.length<1||data.length>CHUNK||offset+data.length>total||staged.length()!=offset)throw new IOException("Invalid staging offset.");
            try(FileOutputStream out=new FileOutputStream(staged,true)){out.write(data);out.getFD().sync();}
            JSObject result=new JSObject().put("bytes",staged.length());
            if(staged.length()==total){String digest=hash(staged);File complete=file(digest+".source");if(complete.exists()){if(complete.length()!=total||!hash(complete).equals(digest))throw new IOException("Invalid existing review source.");if(!staged.delete())throw new IOException("Could not finish staging.");}else if(!staged.renameTo(complete))throw new IOException("Could not finish staging.");result.put("sha256",digest).put("path",complete.getAbsolutePath());}
            call.resolve(result);
        }catch(Exception error){call.reject("Could not prepare the recording for upload.","STAGING");}});
    }
    @PluginMethod public void readState(PluginCall call){String key=call.getString("key","");try{String value=getContext().getSharedPreferences("spino-drive-media",0).getString(key,null);call.resolve(new JSObject().put("value",value==null?JSONObject.NULL:new JSObject(value)));}catch(Exception error){call.reject("Invalid Drive transfer state.");}}
    @PluginMethod public void writeState(PluginCall call){JSObject value=call.getObject("value");String key=call.getString("key","");if(!key.matches("media1\\.[\\w.-]{1,500}")||value==null||value.toString().length()>8192){call.reject("Invalid Drive transfer state.");return;}if(!getContext().getSharedPreferences("spino-drive-media",0).edit().putString(key,value.toString()).commit()){call.reject("Could not retain transfer progress.");return;}call.resolve();}
    @PluginMethod public void download(PluginCall call){
        worker.execute(()->{HttpURLConnection c=null;try{
            String access=access(call),id=call.getString("fileId",""),digest=call.getString("sha256","");long expected=integer(call,"bytes");
            if(!id.matches("[\\w-]{1,160}")||!digest.matches("[a-f0-9]{64}")||expected<1||expected>LIMIT)throw new IOException("Invalid recording download.");
            String type=call.getString("mimeType","");String extension=type.equals("audio/midi")?"mid":type.startsWith("video/mp4")||type.startsWith("audio/mp4")?"mp4":type.startsWith("audio/wav")?"wav":type.startsWith("audio/ogg")?"ogg":"webm";
            File complete=file(digest+"."+extension),part=file(digest+".part");
            if(!(complete.exists()&&complete.length()==expected&&hash(complete).equals(digest))){
                long offset=part.length();if(offset>expected)throw new IOException("Invalid partial download.");
                if(offset<expected){
                    c=connection("https://www.googleapis.com/drive/v3/files/"+id+"?alt=media","GET",access);c.setRequestProperty("Range","bytes="+offset+"-");int status=c.getResponseCode();
                    if(status==206){if(!("bytes "+offset+"-"+(expected-1)+"/"+expected).equals(c.getHeaderField("Content-Range")))throw new IOException("Invalid download range.");}
                    else if(status==200)offset=0;else throw new IOException("Drive download unavailable.");
                    try(InputStream in=c.getInputStream();FileOutputStream out=new FileOutputStream(part,offset>0)){byte[] buffer=new byte[65536];int n;long size=offset;while((n=in.read(buffer))!=-1){if(paused)throw new IOException("Recording copies paused.");network();size+=n;if(size>expected)throw new IOException("Recording exceeds expected size.");out.write(buffer,0,n);}out.getFD().sync();}
                }
                if(part.length()!=expected)throw new IOException("Recording download is incomplete.");
                if(!hash(part).equals(digest)){part.delete();throw new IOException("Recording checksum differs.");}
                if(!part.renameTo(complete))throw new IOException("Could not finish recording download.");
            }
            call.resolve(new JSObject().put("path",complete.getAbsolutePath()).put("sha256",digest).put("bytes",expected));
        }catch(Exception error){call.reject("Recording download failed verification or was interrupted. Retry to resume.","DOWNLOAD");}finally{if(c!=null)c.disconnect();}});
    }
    @PluginMethod public void release(PluginCall call){
        worker.execute(()->{try{String digest=call.getString("sha256",""),stage=call.getString("stage","");
          if(!digest.isEmpty()){if(!digest.matches("[a-f0-9]{64}"))throw new IOException();for(String suffix:new String[]{".source",".webm",".mp4",".wav",".ogg"})file(digest+suffix).delete();}
          if(!stage.isEmpty()){if(!stage.matches("[a-zA-Z0-9-]{1,80}"))throw new IOException();file(stage+".stage").delete();}call.resolve();
        }catch(Exception error){call.reject("Could not release recording transfer cache.");}});
    }
    @Override protected void handleOnDestroy(){token=null;accountId=null;worker.shutdownNow();}
}
