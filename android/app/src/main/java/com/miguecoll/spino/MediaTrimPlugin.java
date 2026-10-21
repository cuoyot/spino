package com.miguecoll.spino;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.transformer.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Export a separate trimmed file. Originals and cloud identities never enter this cache. */
@CapacitorPlugin(name="MediaTrim")
public class MediaTrimPlugin extends Plugin {
    private static final long LIMIT=250L*1024*1024;
    private static final int CHUNK=256*1024;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final Handler main=new Handler(Looper.getMainLooper());
    private volatile Job job;
    private Transformer transformer;
    private PluginCall exportCall;
    private static class Job {
        final String token,kind; final File source,output; final long size;
        volatile boolean exporting=false; volatile int percent=0;
        Job(File dir,String token,long size,String kind){this.token=token;this.size=size;this.kind=kind;source=new File(dir,token+".source");output=new File(dir,token+".mp4");}
    }
    private static long integer(PluginCall call,String name)throws IOException{
        Object value=call.getData().opt(name);if(!(value instanceof Number))throw new IOException("Invalid trim value.");
        Number n=(Number)value;long whole=n.longValue();if(!Double.isFinite(n.doubleValue())||whole!=n.doubleValue())throw new IOException("Invalid trim value.");return whole;
    }
    private Job selected(PluginCall call)throws IOException{
        Job value=job;if(value==null||!value.token.equals(call.getString("token")))throw new IOException("Trim expired. Try again.");return value;
    }
    @PluginMethod public void begin(PluginCall call){worker.execute(()->{
        try{
            long size=integer(call,"size");String kind=call.getString("kind","");
            if(job!=null||size<1||size>LIMIT||!(kind.equals("audio")||kind.equals("video")))throw new IOException("Invalid recording trim.");
            File dir=new File(getContext().getCacheDir(),"spino-trim");if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("Trim cache unavailable.");
            File[] old=dir.listFiles();if(old!=null)for(File file:old)file.delete();
            if(dir.getUsableSpace()<size*2+16L*1024*1024)throw new IOException("Not enough space to trim this recording.");
            Job value=new Job(dir,UUID.randomUUID().toString(),size,kind);if(!value.source.createNewFile())throw new IOException("Trim cache unavailable.");
            job=value;call.resolve(new JSObject().put("token",value.token));
        }catch(Exception e){call.reject(e.getMessage(),"TRIM");}
    });}
    @PluginMethod public void writeChunk(PluginCall call){worker.execute(()->{
        try{
            Job value=selected(call);long offset=integer(call,"offset");String encoded=call.getString("base64","");
            if(value.exporting||encoded.length()>4*((CHUNK+2)/3))throw new IOException("Invalid trim chunk.");
            byte[] bytes=Base64.decode(encoded,Base64.NO_WRAP);
            if(bytes.length<1||bytes.length>CHUNK||offset!=value.source.length()||offset+bytes.length>value.size)throw new IOException("Invalid trim offset.");
            try(FileOutputStream out=new FileOutputStream(value.source,true)){out.write(bytes);}call.resolve();
        }catch(Exception e){call.reject(e.getMessage(),"TRIM");}
    });}
    @PluginMethod public void trim(PluginCall call){worker.execute(()->{
        try{
            Job value=selected(call);long start=integer(call,"startMs"),end=integer(call,"endMs");
            if(value.exporting||value.source.length()!=value.size||start<0||end-start<200||end>15*60*1000L+1000)throw new IOException("Invalid recording segment.");
            value.exporting=true;
            main.post(()->{
                if(job!=value){call.reject("Trim cancelled.","CANCELLED");return;}
                exportCall=call;
                try{
                    MediaItem media=new MediaItem.Builder().setUri(Uri.fromFile(value.source)).setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder().setAllowUnseekableMedia(true).setStartPositionMs(start).setEndPositionMs(end).build()).build();
                    EditedMediaItem item=new EditedMediaItem.Builder(media).setRemoveVideo(value.kind.equals("audio")).build();
                    transformer=new Transformer.Builder(getContext()).setAudioMimeType(MimeTypes.AUDIO_AAC).setVideoMimeType(MimeTypes.VIDEO_H264).addListener(new Transformer.Listener(){
                        @Override public void onCompleted(Composition composition,ExportResult result){
                            if(job!=value||exportCall==null)return;
                            PluginCall pending=exportCall;exportCall=null;transformer=null;value.percent=100;
                            if(value.output.length()<1||value.output.length()>LIMIT){pending.reject("The trimmed recording is empty or too large.","TRIM");return;}
                            pending.resolve(new JSObject().put("path",value.output.getAbsolutePath()).put("bytes",value.output.length()).put("mimeType",value.kind+"/mp4"));
                        }
                        @Override public void onError(Composition composition,ExportResult result,ExportException exception){
                            if(job!=value||exportCall==null)return;
                            PluginCall pending=exportCall;exportCall=null;transformer=null;pending.reject("Could not trim this recording. The original is kept.","TRIM",exception);
                        }
                    }).build();
                    transformer.start(item,value.output.getAbsolutePath());
                }catch(Exception error){exportCall=null;if(transformer!=null)transformer.cancel();transformer=null;call.reject("Could not trim this recording. The original is kept.","TRIM",error);}
            });
        }catch(Exception e){call.reject(e.getMessage(),"TRIM");}
    });}
    @PluginMethod public void progress(PluginCall call){main.post(()->{
        try{Job value=selected(call);if(transformer!=null){ProgressHolder holder=new ProgressHolder();if(transformer.getProgress(holder)==Transformer.PROGRESS_STATE_AVAILABLE)value.percent=holder.progress;}call.resolve(new JSObject().put("percent",value.percent));}
        catch(Exception e){call.reject(e.getMessage(),"TRIM");}
    });}
    @PluginMethod public void cancel(PluginCall call){main.post(()->{
        Job value=job;if(value==null||!value.token.equals(call.getString("token"))){call.resolve();return;}
        if(transformer!=null)transformer.cancel();transformer=null;
        if(exportCall!=null){exportCall.reject("Trim cancelled.","CANCELLED");exportCall=null;}
        worker.execute(()->{value.source.delete();value.output.delete();if(job==value)job=null;call.resolve();});
    });}
    @Override protected void handleOnDestroy(){main.post(()->{if(transformer!=null)transformer.cancel();transformer=null;Job value=job;job=null;if(value!=null){value.source.delete();value.output.delete();}worker.shutdownNow();});}
}
