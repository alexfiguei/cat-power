package pt.catpower.wear;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.Locale;

public final class WatchActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView pulse, elapsed, status;
    private Button toggle;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        int pad = Math.round(18 * getResources().getDisplayMetrics().density);
        layout.setPadding(pad, pad, pad, pad);
        scroll.addView(layout);
        label(layout, "CAT POWER", 15);
        pulse = label(layout, "— bpm", 30);
        elapsed = label(layout, "00:00", 18);
        status = label(layout, WatchService.status, 14);
        toggle = new Button(this);
        layout.addView(toggle);
        toggle.setOnClickListener(v -> {
            if (WatchService.running) stopService(new Intent(this, WatchService.class));
            else if (checkSelfPermission(permission()) == PackageManager.PERMISSION_GRANTED) begin();
            else requestPermissions(new String[]{permission()}, 4);
        });
        setContentView(scroll);
    }

    private TextView label(LinearLayout layout, String text, int size) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(0xffffffff);
        view.setGravity(Gravity.CENTER);
        layout.addView(view);
        return view;
    }

    private String permission() {
        return Build.VERSION.SDK_INT >= 36 ? "android.permission.health.READ_HEART_RATE" : "android.permission.BODY_SENSORS";
    }

    @Override public void onRequestPermissionsResult(int code, String[] names, int[] results) {
        super.onRequestPermissionsResult(code, names, results);
        if (code != 4) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) begin();
        else WatchService.status = "Autoriza os batimentos nas permissões da Cat Power.";
    }

    private void begin() {
        try { startForegroundService(new Intent(this, WatchService.class)); }
        catch (RuntimeException e) { WatchService.status = "Não foi possível iniciar. Abre a app e tenta novamente."; }
    }

    private final Runnable refresh = new Runnable() {
        @Override public void run() {
            int bpm = WatchService.currentBpm();
            pulse.setText(bpm > 0 ? bpm + " bpm" : "— bpm");
            long seconds = WatchService.running ? (SystemClock.elapsedRealtime() - WatchService.start) / 1000 : 0;
            elapsed.setText(String.format(Locale.ROOT,"%02d:%02d",seconds/60,seconds%60));
            status.setText(WatchService.status);
            toggle.setText(WatchService.running ? "Terminar" : "Começar");
            handler.postDelayed(this, 1000);
        }
    };
    @Override protected void onResume() { super.onResume(); refresh.run(); }
    @Override protected void onPause() { handler.removeCallbacks(refresh); super.onPause(); }
}
