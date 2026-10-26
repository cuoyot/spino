package com.miguecoll.spino;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import org.json.JSONArray;
import java.io.*;
import java.security.MessageDigest;
import java.util.Arrays;

/** Device-local ZIP archives. Retention runs only after shared ownership is committed. */
final class LocalBackupArchive {
    private final Context context;
    private final SharedPreferences settings;
    LocalBackupArchive(Context context) {
        this.context=context;
        settings=context.getSharedPreferences("spino-local-backup-archives",Context.MODE_PRIVATE);
    }
    private static void validate(String notebookId) throws IOException {
        if(notebookId==null||!notebookId.matches("[\\w-]{1,180}"))throw new IOException("Invalid notebook identity.");
    }
    private static byte[] hash(InputStream source) throws Exception {
        try(InputStream input=source){MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] bytes=new byte[65536];int n;
            while((n=input.read(bytes))!=-1){if(Thread.currentThread().isInterrupted())throw new InterruptedIOException();digest.update(bytes,0,n);}return digest.digest();}
    }
    Uri save(File file,long size,String notebookId) throws Exception {
        validate(notebookId);
        if(!file.getName().endsWith(".zip")||file.length()!=size)throw new IOException("Invalid backup archive.");
        ContentResolver resolver=context.getContentResolver();Uri uri=null;
        try {
            if(Build.VERSION.SDK_INT>=29){
                ContentValues values=new ContentValues();values.put(MediaStore.MediaColumns.DISPLAY_NAME,file.getName());values.put(MediaStore.MediaColumns.MIME_TYPE,"application/zip");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/SPino backups/"+notebookId+"/");values.put(MediaStore.MediaColumns.IS_PENDING,1);
                uri=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);if(uri==null)throw new IOException("Backup folder unavailable.");
                final Uri target=uri;
                DocumentExport.write(new FileInputStream(file),()->resolver.openOutputStream(target,"w"),size);
                if(!Arrays.equals(hash(new FileInputStream(file)),hash(resolver.openInputStream(uri))))throw new IOException("Backup checksum mismatch.");
                ContentValues ready=new ContentValues();ready.put(MediaStore.MediaColumns.IS_PENDING,0);if(resolver.update(uri,ready,null,null)!=1)throw new IOException("Could not finish the backup archive.");
            } else {
                File base=context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);if(base==null)throw new IOException("Backup folder unavailable.");
                File folder=new File(base,"SPino backups/"+notebookId);if(!folder.isDirectory()&&!folder.mkdirs())throw new IOException("Backup folder unavailable.");
                File target=new File(folder,file.getName());if(!target.createNewFile())throw new IOException("A backup with this name already exists.");uri=Uri.fromFile(target);
                DocumentExport.write(new FileInputStream(file),()->new FileOutputStream(target),size);
                if(!Arrays.equals(hash(new FileInputStream(file)),hash(new FileInputStream(target))))throw new IOException("Backup checksum mismatch.");
            }
            if(!settings.edit().putString("pending."+uri,notebookId).commit())throw new IOException("Could not record the backup archive.");
            return uri;
        } catch(Exception error) {if(uri!=null)try{delete(uri);}catch(Exception ignored){}throw error;}
    }
    private void delete(Uri uri) throws IOException {
        if("file".equals(uri.getScheme())){File file=new File(uri.getPath());if(file.exists()&&!file.delete())throw new IOException("Could not remove an old backup.");}
        else context.getContentResolver().delete(uri,null,null);
    }
    void commit(String notebookId,Uri uri) throws Exception {
        validate(notebookId);String key="archives."+notebookId;
        JSONArray previous=new JSONArray(settings.getString(key,"[]")),all=new JSONArray();boolean found=false;
        for(int i=0;i<previous.length();i++){String value=previous.getString(i);if(value.equals(uri.toString()))found=true;all.put(value);}
        if(!found){if(!notebookId.equals(settings.getString("pending."+uri,"")))throw new IOException("Backup archive unavailable.");all.put(uri.toString());}
        // Save the complete registry first so a failed prune can be retried without losing ownership.
        if(!settings.edit().putString(key,all.toString()).remove("pending."+uri).commit())throw new IOException("Could not record the backup archive.");
        JSONArray retained=new JSONArray();for(int i=0;i<all.length();i++){if(i<all.length()-7)delete(Uri.parse(all.getString(i)));else retained.put(all.getString(i));}
        if(!settings.edit().putString(key,retained.toString()).commit())throw new IOException("Could not record backup retention.");
    }
}
