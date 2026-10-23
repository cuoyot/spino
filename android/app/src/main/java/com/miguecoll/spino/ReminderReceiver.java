package com.miguecoll.spino;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String PREFS = "piano-reminders";
    private static PendingIntent alarmIntent(Context context, JSONObject item) {
        Intent intent = new Intent(context, ReminderReceiver.class).setAction("piano.REMINDER").setData(Uri.parse("piano://reminder/" + Uri.encode(item.optString("id"))));
        intent.putExtra("title", item.optString("title"));
        intent.putExtra("body", item.optString("body"));
        intent.putExtra("language", "es".equals(item.optString("language")) ? "es" : "en");
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void schedule(Context context, JSONArray items) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item != null && item.optLong("at") > System.currentTimeMillis()) manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.optLong("at"), alarmIntent(context, item));
        }
    }
    public static void replace(Context context, JSONArray items) throws JSONException {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray previous = new JSONArray(prefs.getString("items", "[]"));
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (int i = 0; i < previous.length(); i++) manager.cancel(alarmIntent(context, previous.getJSONObject(i)));
        prefs.edit().putString("items", items.toString()).apply();
        schedule(context, items);
    }
    @Override public void onReceive(Context context, Intent intent) {
        if (!"piano.REMINDER".equals(intent.getAction())) {
            try { schedule(context, new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("items", "[]"))); } catch (JSONException ignored) {}
            return;
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean spanish = "es".equals(intent.getStringExtra("language"));
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel("practice", spanish ? "Prácticas y eventos" : "Practice and events", NotificationManager.IMPORTANCE_DEFAULT));
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(context, "practice").setSmallIcon(R.drawable.ic_practice_notification).setContentTitle(intent.getStringExtra("title")).setContentText(intent.getStringExtra("body") != null && !intent.getStringExtra("body").isEmpty() ? intent.getStringExtra("body") : spanish ? "Empieza en unos 15 minutos. Tu cuaderno está preparado." : "Starts in about 15 minutes. Your notebook is ready.").setContentIntent(content).setAutoCancel(true).build();
        try { manager.notify(intent.getDataString(), 1, notification); } catch (SecurityException ignored) {}
    }
}
