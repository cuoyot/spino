package com.miguecoll.spino;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.content.Context;
import android.os.Build;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;

/** System file pickers and local reminders. No accounts or application server. */
@CapacitorPlugin(name = "Notebook", permissions = {
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class NotebookPlugin extends Plugin {
    private boolean practiceAwakeRequested = false;

    @PluginMethod public void practiceScreenAwake(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        getActivity().runOnUiThread(() -> {
            practiceAwakeRequested = enabled;
            if (enabled) getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @Override protected void handleOnPause() {
        getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override protected void handleOnResume() {
        // Returning from a temporary native overlay may not trigger a web visibility change.
        if (practiceAwakeRequested) getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @PluginMethod public void applyAppearance(PluginCall call) {
        boolean dark = call.getBoolean("dark", true);
        getActivity().runOnUiThread(() -> {
            int color = android.graphics.Color.parseColor(dark ? "#14161a" : "#f3f5fa");
            getActivity().getWindow().setStatusBarColor(color);
            getActivity().getWindow().setNavigationBarColor(color);
            call.resolve();
        });
    }

    @PluginMethod public void scoreFullscreen(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).setScoreFullscreen(enabled);
            call.resolve();
        });
    }

    private static class Transfer { volatile boolean cancelled; volatile HttpURLConnection connection; }
    private final ConcurrentHashMap<String, Transfer> transfers = new ConcurrentHashMap<>();
    private ConnectivityManager connectivity() { return (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE); }
    private boolean allowed(Network network, boolean wifiOnly) {
        NetworkCapabilities caps = connectivity().getNetworkCapabilities(network);
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && (!wifiOnly || caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED));
    }
    @PluginMethod public void networkStatus(PluginCall call) {
        Network network = connectivity().getActiveNetwork();
        NetworkCapabilities caps = connectivity().getNetworkCapabilities(network);
        call.resolve(new JSObject().put("online", caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET))
            .put("wifi", caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))
            .put("metered", caps == null || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)));
    }
    @PluginMethod public void cancelDownload(PluginCall call) {
        Transfer transfer = transfers.get(call.getString("id", ""));
        if (transfer != null) { transfer.cancelled = true; if (transfer.connection != null) transfer.connection.disconnect(); }
        call.resolve();
    }
    private static byte[] readLimited(InputStream in, int limit) throws IOException {
        if (in == null) throw new IOException("No se puede abrir el archivo.");
        try (InputStream source = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int n;
            while ((n = source.read(buffer)) != -1) { if (out.size() + n > limit) throw new IOException("El archivo supera el tamaño permitido."); out.write(buffer, 0, n); }
            return out.toByteArray();
        }
    }
    @PluginMethod public void exportFile(PluginCall call) {
        if (call.getString("text") == null) { call.reject("Falta el contenido de la copia."); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "spino-backup.json"));
        startActivityForResult(call, intent, "exportResult");
    }
    @ActivityCallback private void exportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        Uri uri = result.getData().getData();
        new Thread(() -> {
            try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (stream == null) throw new IOException("No se puede escribir en el destino.");
                stream.write(call.getString("text").getBytes(StandardCharsets.UTF_8)); call.resolve();
            } catch (Exception e) { call.reject("No se ha podido exportar: " + e.getMessage()); }
        }).start();
    }
    @PluginMethod public void importFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        startActivityForResult(call, intent, "importResult");
    }
    @ActivityCallback private void importResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        Uri uri = result.getData().getData();
        new Thread(() -> {
            try { String text = new String(readLimited(getContext().getContentResolver().openInputStream(uri), 60000000), StandardCharsets.UTF_8); call.resolve(new JSObject().put("text", text)); }
            catch (Exception e) { call.reject("No se ha podido abrir la copia: " + e.getMessage()); }
        }).start();
    }
    @PluginMethod public void openPDF(PluginCall call) {
        new Thread(() -> {
            try {
                byte[] data = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
                if (data.length < 5 || data.length > 20000000 || !new String(data, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) throw new IOException("PDF no válido.");
                File dir = new File(getContext().getCacheDir(), "scores"); dir.mkdirs();
                // One preview file prevents unbounded growth of the cache.
                File file = new File(dir, "partitura.pdf");
                try (FileOutputStream out = new FileOutputStream(file)) { out.write(data); }
                Intent intent = new Intent(getContext(), ScoreActivity.class);
                intent.putExtra("language", "es".equals(call.getString("language")) ? "es" : "en");
                getActivity().runOnUiThread(() -> { try { getActivity().startActivity(intent); call.resolve(); } catch (Exception e) { call.reject("No se pudo abrir la partitura."); } });
            } catch (Exception e) { call.reject(e.getMessage()); }
        }).start();
    }
    @PluginMethod public void downloadPDF(PluginCall call) {
        String id = call.getString("id", "preview");
        Transfer transfer = new Transfer();
        if (transfers.putIfAbsent(id, transfer) != null) { call.reject("La descarga ya está en curso."); return; }
        new Thread(() -> {
            HttpURLConnection connection = null;
            Network network = null;
            boolean wifiOnly = call.getBoolean("wifiOnly", true);
            try {
                network = connectivity().getActiveNetwork();
                if (!allowed(network, wifiOnly)) throw new IOException(wifiOnly ? "WIFI_REQUIRED" : "Sin conexión.");
                URL url = new URL(call.getString("url", ""));
                if (!url.getProtocol().equals("https") || !url.getHost().equals("www.mutopiaproject.org") || !url.getPath().startsWith("/ftp/")) throw new IOException("Fuente de descarga no admitida.");
                // Bind to the approved network so a Wi-Fi loss cannot fall back to cellular.
                connection = (HttpURLConnection) network.openConnection(url); transfer.connection = connection;
                connection.setConnectTimeout(15000); connection.setReadTimeout(30000); connection.setInstanceFollowRedirects(false);
                if (connection.getResponseCode() != 200) throw new IOException("La fuente no está disponible. Reintenta más tarde.");
                long total = Math.max(0, connection.getContentLengthLong());
                if (total > 20000000) throw new IOException("El PDF supera 20 MB.");
                byte[] data;
                try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int count; long lastUpdate = 0;
                    while ((count = in.read(buffer)) != -1) {
                        if (transfer.cancelled) throw new IOException("Descarga pausada.");
                        if (!allowed(network, wifiOnly)) throw new IOException(wifiOnly ? "WIFI_REQUIRED" : "Sin conexión.");
                        if (out.size() + count > 20000000) throw new IOException("El PDF supera 20 MB.");
                        out.write(buffer, 0, count);
                        if (System.currentTimeMillis() - lastUpdate > 100) {
                            notifyListeners("downloadProgress", new JSObject().put("id", id).put("loaded", out.size()).put("total", total));
                            lastUpdate = System.currentTimeMillis();
                        }
                    }
                    data = out.toByteArray();
                }
                if (transfer.cancelled) throw new IOException("Descarga pausada.");
                if (data.length < 5 || !new String(data, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) throw new IOException("La fuente no ha devuelto un PDF.");
                call.resolve(new JSObject().put("base64", Base64.encodeToString(data, Base64.NO_WRAP)));
            } catch (Exception e) {
                String reason = !transfer.cancelled && wifiOnly && !allowed(network, true) ? "WIFI_REQUIRED" : e.getMessage();
                call.reject("No se pudo descargar: " + reason);
            }
            finally { if (connection != null) connection.disconnect(); transfers.remove(id, transfer); }
        }).start();
    }
    @PluginMethod public void downloadScore(PluginCall call) {
        String id = call.getString("id", "score");
        Transfer transfer = new Transfer();
        if (transfers.putIfAbsent(id, transfer) != null) { call.reject("This score transfer is already running."); return; }
        new Thread(() -> {
            HttpURLConnection connection = null; Network network = null;
            boolean wifiOnly = call.getBoolean("wifiOnly", true);
            String address = call.getString("url", ""), validator = null;
            int status = 0; long retryAt = 0;
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            JSObject previous = call.getObject("partial", null);
            try {
                URL url = new URL(address);
                if (!url.getProtocol().equals("https") || !url.getHost().equals("raw.githubusercontent.com") || url.getPort() != -1 || url.getUserInfo() != null || url.getQuery() != null || url.getRef() != null
                    || !url.getPath().matches("/(musetrainer/library|OpenScore/Lieder)/[a-f0-9]{40}/.+\\.(mxl|xml|musicxml)")
                    || url.getPath().matches(".*(?i)(%2e|%2f|%5c|/\\.\\./).*")) throw new IOException("This score source is not approved for acquisition.");
                network = connectivity().getActiveNetwork();
                if (!allowed(network, wifiOnly)) throw new IOException(wifiOnly ? "WIFI_REQUIRED" : "Offline.");
                byte[] prefix = null; String previousValidator = null;
                if (previous != null && address.equals(previous.optString("url")) && !previous.optString("validator").isEmpty()) {
                    prefix = Base64.decode(previous.optString("base64"), Base64.DEFAULT);
                    previousValidator = previous.optString("validator");
                    if (prefix.length > 25000000) throw new IOException("Invalid partial score size.");
                }
                connection = (HttpURLConnection) network.openConnection(url); transfer.connection = connection;
                connection.setConnectTimeout(15000); connection.setReadTimeout(30000); connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Accept-Encoding", "identity");
                if (prefix != null && prefix.length > 0) { connection.setRequestProperty("Range", "bytes=" + prefix.length + "-"); connection.setRequestProperty("If-Range", previousValidator); }
                status = connection.getResponseCode();
                String retry = connection.getHeaderField("Retry-After");
                if (retry != null) {
                    try { retryAt = System.currentTimeMillis() + Long.parseLong(retry) * 1000; }
                    catch (NumberFormatException ignored) { try { retryAt = java.time.ZonedDateTime.parse(retry, java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli(); } catch (Exception invalidDate) {} }
                }
                if (status != 200 && status != 206) throw new IOException("HTTP " + status + ": score acquisition failed.");
                validator = connection.getHeaderField("ETag"); if (validator != null && validator.startsWith("W/")) validator = null;
                if (validator == null) validator = connection.getHeaderField("Last-Modified");
                long rangeTotal = 0;
                if (status == 206) {
                    java.util.regex.Matcher range = java.util.regex.Pattern.compile("bytes (\\d+)-(\\d+)/(\\d+)").matcher(String.valueOf(connection.getHeaderField("Content-Range")));
                    if (prefix == null || !range.matches() || Long.parseLong(range.group(1)) != prefix.length || Long.parseLong(range.group(2)) != Long.parseLong(range.group(3)) - 1 || Long.parseLong(range.group(3)) > 25000000 || !previousValidator.equals(validator)) { previous = null; throw new IOException("Invalid partial response; restart the download."); }
                    rangeTotal = Long.parseLong(range.group(3));
                    output.write(prefix);
                }
                long size = connection.getContentLengthLong(), total = rangeTotal > 0 ? rangeTotal : size < 0 ? 0 : size + output.size();
                String type = String.valueOf(connection.getContentType());
                if (total > 25000000 || type.contains("text/html") || type.contains("application/json")) throw new IOException("The source returned an oversized file or a non-score response.");
                try (InputStream input = connection.getInputStream()) {
                    byte[] buffer = new byte[8192]; int count; long lastUpdate = 0;
                    while ((count = input.read(buffer)) != -1) {
                        if (transfer.cancelled) throw new IOException("Download paused.");
                        if (!allowed(network, wifiOnly)) throw new IOException(wifiOnly ? "WIFI_REQUIRED" : "Offline.");
                        if (output.size() + count > 25000000) throw new IOException("The score exceeds 25 MB.");
                        output.write(buffer, 0, count);
                        if (System.currentTimeMillis() - lastUpdate > 100) { notifyListeners("downloadProgress", new JSObject().put("id", id).put("loaded", output.size()).put("total", total)); lastUpdate = System.currentTimeMillis(); }
                    }
                }
                if (transfer.cancelled) throw new IOException("Download paused.");
                if (total > 0 && output.size() != total) throw new IOException("Incomplete score response.");
                call.resolve(new JSObject().put("complete", true).put("base64", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)).put("url", address).put("finalUrl", address).put("httpStatus", status).put("validator", validator).put("bytes", output.size()).put("downloadedAt", java.time.Instant.now().toString()));
            } catch (Exception error) {
                String message = !transfer.cancelled && wifiOnly && !allowed(network, true) ? "WIFI_REQUIRED" : error.getMessage();
                JSObject partial = output.size() > 0 && validator != null ? new JSObject().put("url", address).put("validator", validator).put("base64", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)) : previous;
                call.resolve(new JSObject().put("complete", false).put("error", message).put("httpStatus", status).put("finalUrl", address).put("nextAttemptAt", retryAt > 0 ? retryAt : null).put("partial", partial));
            } finally { if (connection != null) connection.disconnect(); transfers.remove(id, transfer); }
        }).start();
    }
    @PluginMethod public void reminders(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && call.getBoolean("requestPermission", false) && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermission"); return;
        }
        schedule(call);
    }
    @PermissionCallback private void notificationPermission(PluginCall call) { schedule(call); }
    private void schedule(PluginCall call) {
        try {
            JSONArray items = call.getArray("items", new JSArray());
            ReminderReceiver.replace(getContext(), items);
            call.resolve(new JSObject().put("enabled", NotificationManagerCompat.from(getContext()).areNotificationsEnabled()));
        } catch (Exception e) { call.reject("No se pudieron programar los avisos.", e); }
    }
}
