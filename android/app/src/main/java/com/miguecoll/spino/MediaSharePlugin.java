package com.miguecoll.spino;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.UUID;
import java.util.HashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Stage recording shares and document exports without loading a whole file into the bridge. */
@CapacitorPlugin(name="MediaShare")
public class MediaSharePlugin extends Plugin {
    private static final long LIMIT=250L*1024*1024;
    private static final int CHUNK=256*1024;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final HashMap<String,Transfer> transfers=new HashMap<>();
    private volatile boolean presenting=false;
    private static class Transfer {
        final File file; final long size; final String mime; boolean finished=false;
        Transfer(File file,long size,String mime){this.file=file;this.size=size;this.mime=mime;}
    }
    private File directory() throws IOException {
        File dir=new File(getContext().getCacheDir(),"spino-share");
        if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("Share cache unavailable.");return dir;
    }
    private void cleanup(File dir) {
        File[] folders=dir.listFiles();if(folders==null)return;
        long cutoff=System.currentTimeMillis()-24L*60*60*1000;
        for(File folder:folders){if(folder.lastModified()>=cutoff||transfers.containsKey(folder.getName()))continue;File[] files=folder.listFiles();if(files!=null)for(File file:files)file.delete();folder.delete();}
    }
    private static long integer(PluginCall call,String name) throws IOException {
        Object value=call.getData().opt(name);if(!(value instanceof Number))throw new IOException("Missing share size.");
        Number number=(Number)value;long n=number.longValue();if(!Double.isFinite(number.doubleValue())||number.doubleValue()!=n)throw new IOException("Invalid share size.");return n;
    }
    private Transfer transfer(PluginCall call) throws IOException {
        Transfer transfer=transfers.get(call.getString("token",""));if(transfer==null)throw new IOException("Share expired. Try again.");return transfer;
    }
    @PluginMethod public void begin(PluginCall call){worker.execute(()->{
        try{
            long size=integer(call,"size");String mime=call.getString("mimeType",""),name=call.getString("name","");
            if(size<1||size>LIMIT||!(mime.equals("application/zip")||mime.matches("(audio|video)/(webm|mp4|ogg|wav|x-wav|mpeg|midi)"))||name.isEmpty()||name.length()>200||name.contains("/")||name.contains("\\")||name.equals(".")||name.equals(".."))throw new IOException("Invalid recording share.");
            File root=directory();cleanup(root);if(root.getUsableSpace()<size+8L*1024*1024)throw new IOException("Not enough temporary space to share this recording.");
            if(transfers.size()>=2)throw new IOException("Another recording is being prepared.");
            String token=UUID.randomUUID().toString();File folder=new File(root,token);if(!folder.mkdir())throw new IOException("Share cache unavailable.");
            File file=new File(folder,name);if(!file.createNewFile()){folder.delete();throw new IOException("Share cache unavailable.");}
            transfers.put(token,new Transfer(file,size,mime));call.resolve(new JSObject().put("token",token));
        }catch(Exception error){call.reject(error.getMessage());}
    });}
    @PluginMethod public void writeChunk(PluginCall call){worker.execute(()->{
        try{
            Transfer transfer=transfer(call);long offset=integer(call,"offset");String encoded=call.getString("base64","");
            if(transfer.finished||offset<0||encoded.length()>4*((CHUNK+2)/3))throw new IOException("Invalid share chunk.");
            byte[] bytes=Base64.decode(encoded,Base64.NO_WRAP);
            if(bytes.length<1||bytes.length>CHUNK||offset!=transfer.file.length()||offset+bytes.length>transfer.size)throw new IOException("Invalid share offset.");
            try(FileOutputStream output=new FileOutputStream(transfer.file,true)){output.write(bytes);}
            call.resolve();
        }catch(Exception error){call.reject(error.getMessage());}
    });}
    @PluginMethod public void share(PluginCall call){worker.execute(()->{
        try{
            Transfer transfer=transfer(call);
            if(transfer.finished||transfer.file.length()!=transfer.size||presenting)throw new IOException("Recording is not ready to share.");
            Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",transfer.file);
            Intent intent=new Intent(Intent.ACTION_SEND).setType(transfer.mime).putExtra(Intent.EXTRA_STREAM,uri)
                .putExtra(Intent.EXTRA_SUBJECT,call.getString("title","SPino"));
            intent.setClipData(ClipData.newRawUri(transfer.file.getName(),uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser=Intent.createChooser(intent,call.getString("dialogTitle","Share recording"));
            transfer.finished=true;presenting=true;
            getActivity().runOnUiThread(()->{try{startActivityForResult(call,chooser,"shareResult");}catch(Exception error){presenting=false;call.reject("Could not open Android sharing.");}});
        }catch(Exception error){call.reject(error.getMessage());}
    });}
    @ActivityCallback private void shareResult(PluginCall call,ActivityResult result){
        presenting=false;if(call==null)return;
        // Keep the granted file available for receivers that read after the chooser closes.
        worker.execute(()->{transfers.remove(call.getString("token",""));call.resolve(new JSObject().put("cancelled",result.getResultCode()==android.app.Activity.RESULT_CANCELED));});
    }
    private void discard(String token) {
        Transfer transfer=transfers.remove(token);
        if(transfer!=null){transfer.file.delete();transfer.file.getParentFile().delete();}
    }
    @PluginMethod public void save(PluginCall call){worker.execute(()->{
        try {
            Transfer transfer=transfer(call);
            if(transfer.finished||transfer.file.length()!=transfer.size||presenting)throw new IOException("The file is not ready to save.");
            // Do not restrict to local storage: cloud document providers such as Drive are valid destinations.
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(transfer.mime).putExtra(Intent.EXTRA_TITLE,transfer.file.getName());
            transfer.finished=true;presenting=true;
            getActivity().runOnUiThread(()->{try{startActivityForResult(call,intent,"saveResult");}catch(Exception error){
                worker.execute(()->{presenting=false;discard(call.getString("token",""));call.reject("Could not open the file save dialog.");});
            }});
        } catch(Exception error){call.reject(error.getMessage());}
    });}
    @ActivityCallback private void saveResult(PluginCall call,ActivityResult result){
        if(call==null){presenting=false;return;}
        worker.execute(()->{
            String token=call.getString("token","");
            try {
                Uri uri=result.getData()==null?null:result.getData().getData();
                if(result.getResultCode()!=android.app.Activity.RESULT_OK||uri==null){call.resolve(new JSObject().put("cancelled",true));return;}
                Transfer transfer=transfer(call);
                // CREATE_DOCUMENT grants write access to this destination. Close the provider stream before reporting success.
                long written=DocumentExport.write(new FileInputStream(transfer.file),()->getContext().getContentResolver().openOutputStream(uri,"w"),transfer.size);
                call.resolve(new JSObject().put("saved",true).put("bytes",written));
            } catch(Exception error){call.reject("Could not save the file. Choose a destination and try again.","SAVE_FAILED",error);}
            finally {discard(token);presenting=false;}
        });
    }
    @PluginMethod public void saveAutomatic(PluginCall call){worker.execute(()->{
        String token=call.getString("token","");
        try {
            Transfer transfer=transfer(call);
            if(transfer.finished||!transfer.mime.equals("application/zip")||transfer.file.length()!=transfer.size)throw new IOException("The file is not ready to save.");
            transfer.finished=true;
            Uri uri=new LocalBackupArchive(getContext()).save(transfer.file,transfer.size,call.getString("notebookId",""));
            call.resolve(new JSObject().put("saved",true).put("bytes",transfer.size).put("uri",uri.toString()));
        } catch(Exception error){call.reject("Could not save the automatic backup on this device.","SAVE_FAILED",error);}
        finally {discard(token);}
    });}
    @PluginMethod public void commitAutomatic(PluginCall call){worker.execute(()->{
        try {new LocalBackupArchive(getContext()).commit(call.getString("notebookId",""),Uri.parse(call.getString("uri","")));call.resolve();}
        catch(Exception error){call.reject("Could not finish automatic backup retention.","SAVE_FAILED",error);}
    });}
    @PluginMethod public void abort(PluginCall call){worker.execute(()->{
        Transfer transfer=transfers.remove(call.getString("token",""));if(transfer!=null&&!transfer.finished){transfer.file.delete();transfer.file.getParentFile().delete();}call.resolve();
    });}
    @Override protected void handleOnDestroy(){worker.shutdownNow();}
}
