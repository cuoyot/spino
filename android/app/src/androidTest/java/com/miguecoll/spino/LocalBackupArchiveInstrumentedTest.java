package com.miguecoll.spino;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.io.*;
import java.util.*;
import java.util.zip.*;

@RunWith(AndroidJUnit4.class)
public class LocalBackupArchiveInstrumentedTest {
    @Test public void automaticArchivesVerifyBytesAndKeepSevenWithoutDocumentPicker() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        String book="review-automatic-"+UUID.randomUUID();
        LocalBackupArchive archive=new LocalBackupArchive(context);
        byte[] payload=new byte[70003];new Random(42).nextBytes(payload);
        List<Uri> created=new ArrayList<>();List<File> staged=new ArrayList<>();
        try {
            for(int i=1;i<=9;i++){
                File file=new File(context.getCacheDir(),"Synthetic notebook_2026-10-"+String.format(Locale.ROOT,"%02d",i)+".zip");staged.add(file);
                try(ZipOutputStream zip=new ZipOutputStream(new FileOutputStream(file))){zip.putNextEntry(new ZipEntry("synthetic.bin"));zip.write(payload);zip.closeEntry();}
                Uri uri=archive.save(file,file.length(),book);created.add(uri);
                try(InputStream actual=context.getContentResolver().openInputStream(uri);InputStream expected=new FileInputStream(file)){
                    int value;long count=0;while((value=expected.read())!=-1){assertEquals(value,actual.read());count++;}assertEquals(-1,actual.read());assertEquals(file.length(),count);
                }
                archive.commit(book,uri);file.delete();
            }
            if(Build.VERSION.SDK_INT>=29){
                String path="Download/SPino backups/"+book+"/";
                try(Cursor files=context.getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,new String[]{MediaStore.MediaColumns.DISPLAY_NAME},MediaStore.MediaColumns.RELATIVE_PATH+" = ?",new String[]{path},null)){
                    assertNotNull(files);assertEquals(7,files.getCount());Set<String> names=new HashSet<>();while(files.moveToNext())names.add(files.getString(0));
                    assertFalse(names.contains("Synthetic notebook_2026-10-01.zip"));assertFalse(names.contains("Synthetic notebook_2026-10-02.zip"));assertTrue(names.contains("Synthetic notebook_2026-10-09.zip"));
                }
            }
            try{archive.commit("another-notebook",created.get(8));fail("A different notebook cannot claim or prune these archives");}catch(IOException expected){}
        } finally {
            for(Uri uri:created)context.getContentResolver().delete(uri,null,null);
            for(File file:staged)file.delete();
        }
    }
}
