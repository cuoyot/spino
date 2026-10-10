package com.miguecoll.spino;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfDocument;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "ScorePrinter")
public class ScorePrinterPlugin extends Plugin {
    @PluginMethod public void print(PluginCall call) {
        final File source;
        try {
            byte[] bytes = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
            if (bytes.length == 0) throw new IllegalArgumentException("Empty score");
            source = File.createTempFile("score-print-", ".pdf", getContext().getCacheDir());
            try (FileOutputStream output = new FileOutputStream(source)) { output.write(bytes); }
        } catch (Exception error) { call.reject("Could not prepare printing", error); return; }
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                String title = call.getString("title", "Score");
                manager.print(title, new PrintDocumentAdapter() {
                    int count;
                    @Override public void onLayout(PrintAttributes oldAttrs, PrintAttributes attrs, CancellationSignal signal, LayoutResultCallback callback, Bundle extras) {
                        if (signal.isCanceled()) { callback.onLayoutCancelled(); return; }
                        try (ParcelFileDescriptor file = ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY); PdfRenderer renderer = new PdfRenderer(file)) {
                            count = renderer.getPageCount();
                            callback.onLayoutFinished(new PrintDocumentInfo.Builder(title + ".pdf").setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).setPageCount(count).build(), true);
                        } catch (Exception error) { callback.onLayoutFailed("Could not open score"); }
                    }
                    @Override public void onWrite(PageRange[] ranges, ParcelFileDescriptor destination, CancellationSignal signal, WriteResultCallback callback) {
                        new Thread(() -> {
                            PdfDocument output = new PdfDocument();
                            try (ParcelFileDescriptor file = ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY); PdfRenderer renderer = new PdfRenderer(file)) {
                                for (int index = 0; index < count; index++) {
                                    if (signal.isCanceled()) { callback.onWriteCancelled(); return; }
                                    boolean selected = false;
                                    for (PageRange range : ranges) if (index >= range.getStart() && index <= range.getEnd()) selected = true;
                                    if (!selected) continue;
                                    try (PdfRenderer.Page page = renderer.openPage(index)) {
                                        PdfDocument.Page printed = output.startPage(new PdfDocument.PageInfo.Builder(page.getWidth(), page.getHeight(), index + 1).create());
                                        Bitmap bitmap = Bitmap.createBitmap(page.getWidth() * 3, page.getHeight() * 3, Bitmap.Config.ARGB_8888);
                                        try {
                                            bitmap.eraseColor(android.graphics.Color.WHITE);
                                            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT);
                                            printed.getCanvas().drawBitmap(bitmap, null, new android.graphics.Rect(0, 0, page.getWidth(), page.getHeight()), null);
                                            output.finishPage(printed);
                                        } finally { bitmap.recycle(); }
                                    }
                                }
                                try (FileOutputStream stream = new FileOutputStream(destination.getFileDescriptor())) { output.writeTo(stream); }
                                callback.onWriteFinished(ranges);
                            } catch (Exception error) { callback.onWriteFailed("Could not print score"); }
                            finally { output.close(); }
                        }, "score-print").start();
                    }
                    @Override public void onFinish() { source.delete(); }
                }, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build());
                call.resolve(new JSObject());
            } catch (Exception error) { source.delete(); call.reject("Printing unavailable", error); }
        });
    }
}
