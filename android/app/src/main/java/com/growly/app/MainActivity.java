package com.growly.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Hide Android native WebView overlay scrollbar ──
        // Android WebView draws its own system-level overlay scrollbar on top
        // of the web content (a thin semi-transparent bar that appears while
        // scrolling). CSS cannot hide this — it's drawn by the Android OS, not
        // the WebView engine. We disable it here at the native level.
        //
        // Scrolling still works perfectly — only the visual bar is suppressed,
        // giving a true native-app feel with no visible scrollbar.
        getBridge().getWebView().post(() -> {
            WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.setVerticalScrollBarEnabled(false);
                wv.setHorizontalScrollBarEnabled(false);
            }
        });
    }
}
