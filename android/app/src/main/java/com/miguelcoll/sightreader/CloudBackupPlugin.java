package com.miguelcoll.sightreader;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

/** A user-selected document provider owns cloud transport; SPino keeps no account tokens. */
@CapacitorPlugin(name = "CloudBackup")
public class CloudBackupPlugin extends Plugin {
    private static final int LIMIT = 60000000;
    private final Object writeLock = new Object();
    private final AtomicBoolean pickerOpen = new AtomicBoolean(false);
    private SharedPreferences preferences() { return getContext().getSharedPreferences("spino-cloud-backup", 0); }
    private byte[] bytes(String text) throws IOException {
        if (text == null) throw new IOException("Backup content is missing.");
        byte[] value = text.getBytes(StandardCharsets.UTF_8);
        if (value.length > LIMIT) throw new IOException("The backup exceeds 60 MB.");
        return value;
    }
    private byte[] read(Uri uri) throws Exception {
        try (InputStream input = getContext().getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (input == null) throw new IOException("The provider cannot open this backup.");
            byte[] buffer = new byte[16384]; int n;
            while ((n = input.read(buffer)) != -1) { if (out.size() + n > LIMIT) throw new IOException("The backup exceeds 60 MB."); out.write(buffer, 0, n); }
            return out.toByteArray();
        }
    }
    private String hash(byte[] value) throws Exception {
        StringBuilder result = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(value)) result.append(String.format("%02x", b & 255));
        return result.toString();
    }
    private void writeVerified(Uri uri, byte[] value) throws Exception {
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) throw new IOException("The provider does not allow writing this backup.");
            output.write(value); output.flush();
        }
        if (!hash(read(uri)).equals(hash(value))) throw new IOException("The provider did not return the complete written backup. The last good local recovery copy is retained.");
    }
    private String name(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{ OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) return cursor.getString(0);
        } catch (Exception ignored) {}
        return "SPino backup";
    }
    private Uri destination() throws IOException {
        String value = preferences().getString("uri", null);
        if (value == null) throw new IOException("Choose a backup destination first.");
        return Uri.parse(value);
    }
    private File recoveryFile() { return new File(getContext().getFilesDir(), "cloud-last-good.json"); }
    private File pendingFile() { return new File(getContext().getFilesDir(), "cloud-picker-pending.json"); }
    private void setupComplete(String mode) {
        preferences().edit().putBoolean("setupPending", true).putString("mode", mode).commit();
        notifyListeners("setupComplete", new JSObject(), true);
    }
    @PluginMethod public void acknowledgeSetup(PluginCall call) {
        preferences().edit().putBoolean("setupPending", false).commit(); call.resolve();
    }
    private void recovery(byte[] value) throws Exception {
        android.util.AtomicFile file = new android.util.AtomicFile(recoveryFile());
        FileOutputStream output = null;
        try { output = file.startWrite(); output.write(value); file.finishWrite(output); }
        catch (Exception error) { if (output != null) file.failWrite(output); throw error; }
    }
    @PluginMethod public void status(PluginCall call) {
        call.resolve(new JSObject().put("linked", preferences().contains("uri")).put("name", preferences().getString("name", ""))
            .put("lastHash", preferences().getString("hash", null)).put("recoveryAvailable", recoveryFile().exists())
            .put("setupPending", preferences().getBoolean("setupPending", false)).put("mode", preferences().getString("mode", "backup")));
    }
    @PluginMethod public void create(PluginCall call) {
        try { bytes(call.getString("text")); } catch (Exception error) { call.reject(error.getMessage()); return; }
        if (!pickerOpen.compareAndSet(false, true)) { call.reject("A file picker is already open."); return; }
        // Capacitor persists activity call arguments in an Android Bundle. Never put score files there.
        try {
            android.util.AtomicFile staged = new android.util.AtomicFile(pendingFile());
            FileOutputStream out = staged.startWrite();
            try { out.write(bytes(call.getString("text"))); staged.finishWrite(out); }
            catch (Exception error) { staged.failWrite(out); throw error; }
            call.getData().remove("text");
        } catch (Exception error) { pickerOpen.set(false); call.reject("Could not prepare backup: " + error.getMessage()); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "SPino-backup.json"));
        try { startActivityForResult(call, intent, "created"); } catch (Exception error) { pickerOpen.set(false); call.reject(error.getMessage()); }
    }
    @ActivityCallback private void created(PluginCall call, ActivityResult result) {
        pickerOpen.set(false); if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { new android.util.AtomicFile(pendingFile()).delete(); call.resolve(new JSObject().put("cancelled", true)); return; }
        Uri uri = result.getData().getData();
        new Thread(() -> { synchronized (writeLock) {
            try {
                int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                if ((flags & 3) != 3) throw new IOException("This provider did not grant read/write access. Choose another destination.");
                getContext().getContentResolver().takePersistableUriPermission(uri, flags);
                byte[] value = read(Uri.fromFile(pendingFile()));
                writeVerified(uri, value); recovery(value);
                String label = name(uri), old = preferences().getString("uri", null);
                preferences().edit().putString("uri", uri.toString()).putString("name", label).putString("hash", hash(value)).commit();
                if (old != null && !old.equals(uri.toString())) release(Uri.parse(old));
                setupComplete(call.getString("mode", "backup"));
                call.resolve(new JSObject().put("name", label));
            } catch (Exception error) { call.reject("Backup destination could not be linked: " + error.getMessage(), "PROVIDER_ERROR"); }
            finally { new android.util.AtomicFile(pendingFile()).delete(); }
        } }).start();
    }
    @PluginMethod public void write(PluginCall call) {
        new Thread(() -> { synchronized (writeLock) {
            try {
                Uri uri = destination(); byte[] old = read(uri);
                if (!hash(old).equals(call.getString("expectedHash", ""))) { call.reject("This backup changed outside this device. Restore it manually or create a separate backup file; it has not been overwritten.", "CONFLICT"); return; }
                byte[] value = bytes(call.getString("text")); recovery(old);
                writeVerified(uri, value);
                preferences().edit().putString("hash", hash(value)).commit();
                call.resolve(new JSObject().put("providerAccepted", true));
            } catch (Exception error) { call.reject("Backup could not be updated: " + error.getMessage(), "PROVIDER_ERROR"); }
        } }).start();
    }
    @PluginMethod public void pickBackup(PluginCall call) {
        if (!pickerOpen.compareAndSet(false, true)) { call.reject("A file picker is already open."); return; }
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        if (call.getBoolean("link", false)) intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try { startActivityForResult(call, intent, "picked"); } catch (Exception error) { pickerOpen.set(false); call.reject(error.getMessage()); }
    }
    @ActivityCallback private void picked(PluginCall call, ActivityResult result) {
        pickerOpen.set(false); if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        new Thread(() -> {
            try {
                Uri uri = result.getData().getData(); byte[] value = read(uri);
                if (call.getBoolean("link", false)) {
                    int flags = result.getData().getFlags() & 3;
                    if (flags != 3) throw new IOException("This provider must grant persistent read/write access for synchronization.");
                    getContext().getContentResolver().takePersistableUriPermission(uri, flags);
                    String old = preferences().getString("uri", null);
                    preferences().edit().putString("uri", uri.toString()).putString("name", name(uri)).putString("hash", hash(value)).commit();
                    if (old != null && !old.equals(uri.toString())) release(Uri.parse(old));
                    setupComplete("sync");
                }
                call.resolve(new JSObject().put("text", new String(value, StandardCharsets.UTF_8)).put("name", name(uri)).put("hash", hash(value)));
            }
            catch (Exception error) { call.reject("Backup could not be read: " + error.getMessage()); }
        }).start();
    }
    @PluginMethod public void readLinked(PluginCall call) {
        new Thread(() -> { synchronized (writeLock) {
            try { byte[] value = read(destination()); call.resolve(new JSObject().put("text", new String(value, StandardCharsets.UTF_8)).put("hash", hash(value))); }
            catch (Exception error) { call.reject("Shared notebook could not be read: " + error.getMessage(), "PROVIDER_ERROR"); }
        } }).start();
    }
    @PluginMethod public void saveRecovery(PluginCall call) {
        new Thread(() -> { synchronized (writeLock) {
            try { recovery(bytes(call.getString("text"))); call.resolve(); }
            catch (Exception error) { call.reject("Local recovery copy could not be saved: " + error.getMessage()); }
        } }).start();
    }
    @PluginMethod public void readRecovery(PluginCall call) {
        new Thread(() -> {
            try { call.resolve(new JSObject().put("text", new String(read(Uri.fromFile(recoveryFile())), StandardCharsets.UTF_8))); }
            catch (Exception error) { call.reject("No readable local recovery copy is available."); }
        }).start();
    }
    private void release(Uri uri) { try { getContext().getContentResolver().releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) {} }
    @PluginMethod public void disconnect(PluginCall call) {
        new Thread(() -> { synchronized (writeLock) {
            String old = preferences().getString("uri", null);
            preferences().edit().clear().commit(); if (old != null) release(Uri.parse(old));
            new android.util.AtomicFile(recoveryFile()).delete();
            call.resolve();
        } }).start();
    }
}
