package com.miguecoll.spino;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean scoreFullscreen = false;

    public void setScoreFullscreen(boolean enabled) {
        scoreFullscreen = enabled;
        WindowCompat.setDecorFitsSystemWindows(getWindow(), !enabled);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        if (enabled) controller.hide(WindowInsetsCompat.Type.systemBars());
        else controller.show(WindowInsetsCompat.Type.systemBars());
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && scoreFullscreen) setScoreFullscreen(true);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MidiPlugin.class);
        registerPlugin(NotebookPlugin.class);
        registerPlugin(ScorePrinterPlugin.class);
        registerPlugin(CloudBackupPlugin.class);
        super.onCreate(savedInstanceState);
        // Let the app close overlays and traverse its screen history before exiting at the root.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                    "(() => { const event = new Event('spino:back', {cancelable:true}); " +
                    "window.dispatchEvent(event); return event.defaultPrevented; })()",
                    handled -> {
                        if (!"true".equals(handled)) {
                            setEnabled(false);
                            getOnBackPressedDispatcher().onBackPressed();
                            setEnabled(true);
                        }
                    });
            }
        });
    }
}
