package com.miguecoll.spino;

import android.net.Uri;
import android.graphics.*;
import android.media.MediaMetadataRetriever;
import androidx.media3.effect.RgbMatrix;
import androidx.media3.effect.Presentation;
import java.util.Collections;
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
                    if(Boolean.TRUE.equals(call.getBoolean("bookends",false))&&value.kind.equals("video")){
                        transformer.start(bookends(value,item,end-start,call.getString("title","SPino"),call.getString("date","")),value.output.getAbsolutePath());
                    }else transformer.start(item,value.output.getAbsolutePath());
                }catch(Exception error){exportCall=null;if(transformer!=null)transformer.cancel();transformer=null;call.reject("Could not trim this recording. The original is kept.","TRIM",error);}
            });
        }catch(Exception e){call.reject(e.getMessage(),"TRIM");}
    });}
    private static RgbMatrix fade(long durationMs){return (timeUs,hdr)->{
        float opacity=Math.max(0,Math.min(1,Math.min(timeUs/300000f,(durationMs*1000-timeUs)/300000f)));
        return new float[]{opacity,0,0,0,0,opacity,0,0,0,0,opacity,0,0,0,0,1};
    };}
    private Composition bookends(Job job,EditedMediaItem body,long duration,String title,String date)throws Exception{
        int width,height,rotation;
        MediaMetadataRetriever metadata=new MediaMetadataRetriever();
        try{
            metadata.setDataSource(job.source.getAbsolutePath());
            width=Integer.parseInt(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
            height=Integer.parseInt(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
            String value=metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);rotation=value==null?0:Integer.parseInt(value);
        }finally{metadata.release();}
        if(rotation==90||rotation==270){int swap=width;width=height;height=swap;}
        // Bound still-image allocations while retaining the recording's aspect ratio.
        float scale=Math.min(1,1920f/Math.max(width,height));width=Math.max(2,Math.round(width*scale)/2*2);height=Math.max(2,Math.round(height*scale)/2*2);
        Presentation presentation=Presentation.createForWidthAndHeight(width,height,Presentation.LAYOUT_SCALE_TO_FIT);
        EditedMediaItem intro=card(job,true,width,height,title,date,3000,presentation);
        EditedMediaItem outro=card(job,false,width,height,title,date,2000,presentation);
        EditedMediaItem video=new EditedMediaItem.Builder(body.mediaItem).setEffects(new Effects(Collections.emptyList(),Collections.singletonList(presentation))).build();
        RgbMatrix transitions=(timeUs,hdr)->{
            long timeMs=timeUs/1000;
            if(timeMs<3000)return fade(3000).getMatrix(timeUs,hdr);
            if(timeMs<3000+duration)return fade(duration).getMatrix(timeUs-3000000,hdr);
            return fade(2000).getMatrix(timeUs-(3000+duration)*1000,hdr);
        };
        return new Composition.Builder(new EditedMediaItemSequence.Builder(intro,video,outro).experimentalSetForceAudioTrack(true).build()).setEffects(new Effects(Collections.emptyList(),Collections.singletonList(transitions))).build();
    }
    private EditedMediaItem card(Job job,boolean intro,int width,int height,String title,String date,long duration,Presentation presentation)throws Exception{
        Bitmap bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);
        try{
            Canvas canvas=new Canvas(bitmap);canvas.drawColor(Color.rgb(20,23,27));boolean portrait=height>width;
            float scale=width/(portrait?720f:1280f),w=width/scale,h=height/scale;canvas.scale(scale,scale);
            float size=intro?170:230,y=intro?(portrait?h*.223f:h*.167f):(h-280)/2;
            Bitmap logo;try(InputStream input=getContext().getAssets().open("public/brand/spino-recording-symbol.png")){logo=BitmapFactory.decodeStream(input);}
            Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);canvas.drawBitmap(logo,null,new RectF((w-size)/2,y,(w+size)/2,y+size),paint);logo.recycle();
            paint.setTextAlign(Paint.Align.CENTER);paint.setColor(Color.rgb(168,181,201));paint.setTextSize(26);paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));canvas.drawText("spinoapp.com",w/2,y+size+43,paint);
            if(intro){
                paint.setTextSize(portrait?38:54);paint.setTypeface(Typeface.create("serif",Typeface.NORMAL));paint.setColor(Color.rgb(243,244,247));
                java.util.List<String> lines=new java.util.ArrayList<>();String line="";
                for(String word:title.split("\\s+")){String next=line.isEmpty()?word:line+" "+word;if(!line.isEmpty()&&paint.measureText(next)>w-80){lines.add(line);line=word;}else line=next;}if(!line.isEmpty())lines.add(line);
                float top=portrait?h*.46f:h*.54f,lineHeight=portrait?48:62;
                float blockScale=Math.min(1,(h-top-70)/(Math.max(1,lines.size())*lineHeight+60));canvas.save();canvas.scale(blockScale,blockScale,w/2,top);
                for(String text:lines){float fit=Math.min(1,(w-80)/Math.max(1,paint.measureText(text)));canvas.save();canvas.scale(fit,1,w/2,top);canvas.drawText(text,w/2,top,paint);canvas.restore();top+=lineHeight;}
                paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));paint.setTextSize(25);paint.setColor(Color.rgb(168,181,201));canvas.drawText(date,w/2,top+32,paint);canvas.restore();
            }
            File file=new File(job.source.getParentFile(),job.token+(intro?"-intro.png":"-outro.png"));try(FileOutputStream out=new FileOutputStream(file)){bitmap.compress(Bitmap.CompressFormat.PNG,100,out);}
            return new EditedMediaItem.Builder(new MediaItem.Builder().setUri(Uri.fromFile(file)).setImageDurationMs(duration).build()).setFrameRate(30).setEffects(new Effects(Collections.emptyList(),Collections.singletonList(presentation))).build();
        }finally{bitmap.recycle();}
    }
    private void deleteFiles(Job value){value.source.delete();value.output.delete();new File(value.source.getParentFile(),value.token+"-intro.png").delete();new File(value.source.getParentFile(),value.token+"-outro.png").delete();}
    @PluginMethod public void progress(PluginCall call){main.post(()->{
        try{Job value=selected(call);if(transformer!=null){ProgressHolder holder=new ProgressHolder();if(transformer.getProgress(holder)==Transformer.PROGRESS_STATE_AVAILABLE)value.percent=holder.progress;}call.resolve(new JSObject().put("percent",value.percent));}
        catch(Exception e){call.reject(e.getMessage(),"TRIM");}
    });}
    @PluginMethod public void cancel(PluginCall call){main.post(()->{
        Job value=job;if(value==null||!value.token.equals(call.getString("token"))){call.resolve();return;}
        if(transformer!=null)transformer.cancel();transformer=null;
        if(exportCall!=null){exportCall.reject("Trim cancelled.","CANCELLED");exportCall=null;}
        worker.execute(()->{deleteFiles(value);if(job==value)job=null;call.resolve();});
    });}
    @Override protected void handleOnDestroy(){main.post(()->{if(transformer!=null)transformer.cancel();transformer=null;Job value=job;job=null;if(value!=null){deleteFiles(value);}worker.shutdownNow();});}
}
