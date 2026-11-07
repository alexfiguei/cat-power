package pt.catpower.wear;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import com.google.android.gms.wearable.CapabilityClient;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONException;
import org.json.JSONObject;

public final class WatchService extends Service implements SensorEventListener {
    static boolean running;
    static String status = "Pronto para ligar";
    static long start, lastSample;
    static int pulse;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SensorManager sensors;
    private String session, phone;
    private long sequence, lastDiscovery;
    private boolean searching;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || "STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (running) return START_NOT_STICKY;
        startForeground(43, notification());
        sensors = getSystemService(SensorManager.class);
        Sensor hr = sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        try {
            if (hr == null || !sensors.registerListener(this, hr, SensorManager.SENSOR_DELAY_NORMAL)) {
                status = "Sensor indisponível. Volta a tentar.";
                stopSelf();
                return START_NOT_STICKY;
            }
        } catch (SecurityException denied) {
            status = "Autoriza a leitura dos batimentos.";
            stopSelf();
            return START_NOT_STICKY;
        }
        start = SystemClock.elapsedRealtime();
        session = UUID.randomUUID().toString();
        lastSample = pulse = 0;
        running = true;
        status = "A procurar o telemóvel…";
        tick.run();
        return START_NOT_STICKY;
    }

    private Notification notification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        String channel = "catpower_training";
        manager.createNotificationChannel(new NotificationChannel(channel, "Treino em direto", NotificationManager.IMPORTANCE_LOW));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, WatchActivity.class), flags);
        Intent stop = new Intent(this, WatchService.class).setAction("STOP");
        return new Notification.Builder(this, channel).setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle("Cat Power · treino em direto").setContentText("A acompanhar o treino")
                .setContentIntent(open).setOngoing(true)
                .addAction(android.R.drawable.ic_media_pause, "Terminar", PendingIntent.getService(this, 1, stop, flags)).build();
    }

    static int currentBpm() {
        return running && SystemClock.elapsedRealtime() - lastSample < 15000 ? pulse : 0;
    }

    @Override public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_HEART_RATE || event.values.length == 0) return;
        int value = Math.round(event.values[0]);
        pulse = event.accuracy > SensorManager.SENSOR_STATUS_UNRELIABLE && value > 0 && value < 300 ? value : 0;
        lastSample = event.timestamp / 1000000L;
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) {
        if (accuracy <= SensorManager.SENSOR_STATUS_UNRELIABLE) pulse = 0;
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!running) return;
            long now = SystemClock.elapsedRealtime();
            if (!searching && (lastDiscovery == 0 || now - lastDiscovery >= 10000)) {
                searching = true;
                lastDiscovery = now;
                Wearable.getCapabilityClient(WatchService.this)
                        .getCapability("catpower_live_phone", CapabilityClient.FILTER_REACHABLE)
                        .addOnSuccessListener(info -> {
                            if (!running) return;
                            phone = null;
                            for (Node node : info.getNodes()) {
                                if (node.isNearby()) { phone = node.getId(); break; }
                            }
                            if (phone == null) status = "À espera do telemóvel emparelhado";
                            else send(true);
                        }).addOnFailureListener(e -> { phone = null; status = "Sem ligação ao telemóvel"; })
                        .addOnCompleteListener(task -> searching = false);
            }
            if (phone != null) send(true);
            handler.postDelayed(this, 3000);
        }
    };

    private void send(boolean active) {
        if (phone == null || session == null) return;
        try {
            JSONObject p = new JSONObject().put("session", session).put("seq", ++sequence)
                    .put("active", active).put("seconds", (SystemClock.elapsedRealtime() - start) / 1000)
                    .put("bpm", active ? currentBpm() : 0);
            Wearable.getMessageClient(this).sendMessage(phone, "/catpower/live/v1", p.toString().getBytes(StandardCharsets.UTF_8))
                    .addOnSuccessListener(id -> { if (active && running) status = "A enviar para o telemóvel"; })
                    .addOnFailureListener(e -> { if (active && running) status = "Sem ligação ao telemóvel"; });
        } catch (JSONException ignored) { }
    }

    @Override public void onDestroy() {
        if (running) {
            running = false;
            send(false);
            status = "Direto terminado";
        }
        handler.removeCallbacks(tick);
        if (sensors != null) sensors.unregisterListener(this);
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
