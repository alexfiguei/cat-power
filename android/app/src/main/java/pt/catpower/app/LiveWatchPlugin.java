package pt.catpower.app;

import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import androidx.wear.remote.interactions.RemoteActivityHelper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.Wearable;
import com.google.common.util.concurrent.ListenableFuture;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "LiveWatch")
public class LiveWatchPlugin extends Plugin implements MessageClient.OnMessageReceivedListener {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private String session = "";
    private long sequence = -1, receivedAt, duration;
    private boolean active;
    private int bpm;

    @Override public void load() {
        Wearable.getMessageClient(getContext()).addListener(this);
    }

    @Override protected void handleOnDestroy() {
        Wearable.getMessageClient(getContext()).removeListener(this);
        executor.shutdown();
    }

    @Override public synchronized void onMessageReceived(MessageEvent event) {
        if (!"/catpower/live/v1".equals(event.getPath()) || event.getData().length > 1024) return;
        try {
            JSONObject packet = new JSONObject(new String(event.getData(), StandardCharsets.UTF_8));
            String id = packet.getString("session");
            long seq = packet.getLong("seq"), seconds = packet.getLong("seconds");
            if (id.isEmpty() || seq < 0 || seconds < 0 || (id.equals(session) && seq <= sequence)) return;
            boolean running = packet.getBoolean("active");
            int pulse = packet.getInt("bpm");
            session = id;
            sequence = seq;
            active = running;
            duration = seconds;
            bpm = pulse > 0 && pulse < 300 ? pulse : 0;
            receivedAt = SystemClock.elapsedRealtime();
        } catch (JSONException ignored) { }
    }

    @PluginMethod public synchronized void snapshot(PluginCall call) {
        JSObject result = new JSObject();
        result.put("seen", !session.isEmpty());
        result.put("active", active);
        result.put("age", (SystemClock.elapsedRealtime() - receivedAt) / 1000);
        result.put("seconds", duration);
        result.put("bpm", bpm);
        call.resolve(result);
    }

    @PluginMethod public void openWatch(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("catpower://live"))
                .addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            ListenableFuture<Void> opened = new RemoteActivityHelper(getContext(), executor)
                    .startRemoteActivity(intent, null);
            opened.addListener(() -> {
                try { opened.get(); call.resolve(); }
                catch (Exception e) { call.reject("Abre a Cat Power no relógio emparelhado."); }
            }, executor);
        } catch (RuntimeException e) { call.reject("Abre a Cat Power no relógio emparelhado."); }
    }
}
