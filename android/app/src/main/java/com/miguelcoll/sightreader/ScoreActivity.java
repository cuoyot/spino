package com.miguelcoll.sightreader;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.*;
import android.widget.*;
import java.io.File;

/** Offline PDF viewer using Android's renderer; no additional application is required. */
public class ScoreActivity extends Activity {
    private PdfRenderer pdf;
    private ParcelFileDescriptor descriptor;
    private Bitmap bitmap;
    private ImageView image;
    private TextView pageLabel;
    private Button previous, next;
    private ScrollView vertical;
    private HorizontalScrollView horizontal;
    private int page = 0;
    private float zoom = 1f;
    private int baseWidth;
    private boolean spanish;
    private String text(String english, String spanishText) { return spanish ? spanishText : english; }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        spanish = "es".equals(getIntent().getStringExtra("language"));
        if (state != null) { page = state.getInt("page", 0); zoom = state.getFloat("zoom", 1f); }
        getWindow().setStatusBarColor(Color.rgb(20,22,26));
        getWindow().setNavigationBarColor(Color.rgb(20,22,26));
        getWindow().getDecorView().setSystemUiVisibility(0);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(20,22,26));
        root.setFitsSystemWindows(true);
        LinearLayout bar = new LinearLayout(this); bar.setGravity(Gravity.CENTER_VERTICAL);
        Button close = button(text("Back", "Volver"), v -> finish()); bar.addView(close);
        previous = button("‹", v -> turnPage(-1)); previous.setContentDescription(text("Previous page", "Página anterior")); bar.addView(previous);
        pageLabel = new TextView(this); pageLabel.setTextColor(Color.rgb(232,234,237)); pageLabel.setGravity(Gravity.CENTER); bar.addView(pageLabel, new LinearLayout.LayoutParams(0, -2, 1));
        next = button("›", v -> turnPage(1)); next.setContentDescription(text("Next page", "Página siguiente")); bar.addView(next);
        root.addView(bar);
        LinearLayout zoomBar = new LinearLayout(this); zoomBar.setGravity(Gravity.CENTER);
        Button zoomOut = button("−", v -> resize(zoom / 1.25f)); zoomOut.setContentDescription(text("Zoom out", "Reducir zoom")); zoomBar.addView(zoomOut);
        zoomBar.addView(button(text("Fit page", "Ajustar"), v -> resize(1f)));
        Button zoomIn = button("+", v -> resize(zoom * 1.25f)); zoomIn.setContentDescription(text("Zoom in", "Ampliar zoom")); zoomBar.addView(zoomIn); root.addView(zoomBar);
        vertical = new ScrollView(this); horizontal = new HorizontalScrollView(this);
        image = new ImageView(this); image.setContentDescription(text("PDF score", "Partitura PDF")); image.setAdjustViewBounds(true); image.setScaleType(ImageView.ScaleType.FIT_XY);
        horizontal.addView(image); vertical.addView(horizontal); root.addView(vertical, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(root);
        ScaleGestureDetector pinch = new ScaleGestureDetector(this, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            private float start;
            @Override public boolean onScaleBegin(ScaleGestureDetector detector) { start = zoom; return true; }
            @Override public boolean onScale(ScaleGestureDetector detector) { start = Math.max(1f, Math.min(3f, start * detector.getScaleFactor())); return true; }
            @Override public void onScaleEnd(ScaleGestureDetector detector) { resize(start); }
        });
        image.setOnTouchListener((v, event) -> { pinch.onTouchEvent(event); if (event.getPointerCount() > 1) { v.getParent().requestDisallowInterceptTouchEvent(true); return true; } return false; });
        try {
            descriptor = ParcelFileDescriptor.open(new File(getCacheDir(), "scores/partitura.pdf"), ParcelFileDescriptor.MODE_READ_ONLY);
            pdf = new PdfRenderer(descriptor); page = Math.max(0, Math.min(page, pdf.getPageCount() - 1));
            baseWidth = getResources().getDisplayMetrics().widthPixels;
            image.post(this::render);
        } catch (Exception e) { Toast.makeText(this, text("Cannot read this PDF. It may be protected or damaged.", "No se puede leer este PDF. Puede estar protegido o dañado."), Toast.LENGTH_LONG).show(); finish(); }
    }
    private Button button(String text, View.OnClickListener listener) {
        Button button = new Button(this); button.setText(text); button.setTextColor(Color.rgb(232,234,237));
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(30,33,39)));
        int touch = (int)(48 * getResources().getDisplayMetrics().density);
        button.setMinWidth(touch); button.setMinimumWidth(touch); button.setMinHeight(touch); button.setOnClickListener(listener); return button;
    }
    private void turnPage(int direction) {
        if (pdf == null || page + direction < 0 || page + direction >= pdf.getPageCount()) return;
        page += direction; render(); vertical.scrollTo(0, 0); horizontal.scrollTo(0, 0);
    }
    private void resize(float value) { zoom = Math.max(1f, Math.min(3f, value)); render(); }
    private void render() {
        if (pdf == null) return;
        try (PdfRenderer.Page current = pdf.openPage(page)) {
            // Fit the whole page before applying the user's zoom, including short landscapes.
            if (vertical.getHeight() > 0) baseWidth = Math.min(getResources().getDisplayMetrics().widthPixels, Math.round((float) vertical.getHeight() * current.getWidth() / current.getHeight()));
            int width = Math.min(2400, Math.round(baseWidth * zoom));
            int height = Math.max(1, Math.round((float) current.getHeight() / current.getWidth() * width));
            Bitmap fresh = Bitmap.createBitmap(width, Math.min(6000, height), Bitmap.Config.ARGB_8888); fresh.eraseColor(Color.WHITE);
            current.render(fresh, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
            image.setImageBitmap(fresh); image.getLayoutParams().width = Math.round(baseWidth * zoom); image.getLayoutParams().height = Math.round((float) fresh.getHeight() / fresh.getWidth() * baseWidth * zoom); image.requestLayout();
            if (bitmap != null) bitmap.recycle(); bitmap = fresh;
            pageLabel.setText((page + 1) + " / " + pdf.getPageCount()); previous.setEnabled(page > 0); next.setEnabled(page + 1 < pdf.getPageCount());
        } catch (Exception e) { Toast.makeText(this, text("Could not display this page.", "No se pudo mostrar esta página."), Toast.LENGTH_LONG).show(); }
    }
    @Override protected void onSaveInstanceState(Bundle state) { state.putInt("page", page); state.putFloat("zoom", zoom); super.onSaveInstanceState(state); }
    @Override protected void onDestroy() { image.setImageDrawable(null); if (bitmap != null) bitmap.recycle(); if (pdf != null) pdf.close(); try { if (descriptor != null) descriptor.close(); } catch (Exception ignored) {} super.onDestroy(); }
}
