package com.miguecoll.spino;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;

/**
 * Receives note-on events from USB and Bluetooth LE MIDI keyboards and forwards them to the web layer.
 */
@CapacitorPlugin(
    name = "Midi",
    permissions = {
        @Permission(alias = "ble", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "bleLegacy", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class MidiPlugin extends Plugin {

    private static final ParcelUuid MIDI_SERVICE = ParcelUuid.fromString("03B80E5A-EDE8-4B33-A751-6CE34EC4C700");

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, MidiDevice> openDevices = Collections.synchronizedMap(new LinkedHashMap<>());
    // Keep ports alive for the full connection lifetime, not just while attach() runs.
    private final Map<Integer, List<MidiOutputPort>> inputPorts = new LinkedHashMap<>();
    private MidiManager.DeviceCallback deviceCallback;
    private final Set<Integer> opening = Collections.synchronizedSet(new HashSet<>());
    private MidiManager midiManager;
    private BluetoothLeScanner scanner;
    private ScanCallback scanCallback;
    private volatile boolean destroyed = false;

    @Override
    public void load() {
        midiManager = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
        if (midiManager == null) return;
        deviceCallback = new MidiManager.DeviceCallback() {
                @Override
                public void onDeviceAdded(MidiDeviceInfo info) {
                    openDevice(info);
                }

                @Override
                public void onDeviceRemoved(MidiDeviceInfo info) {
                    closePorts(info.getId());
                    MidiDevice d = openDevices.remove(info.getId());
                    closeQuietly(d);
                    notifyDevices();
                }
            };
        midiManager.registerDeviceCallback(deviceCallback, handler);
    }

    @PluginMethod
    public void openAll(PluginCall call) {
        if (midiManager == null) {
            call.reject("MIDI is not supported on this device");
            return;
        }
        for (MidiDeviceInfo info : midiManager.getDevices()) openDevice(info);
        JSObject ret = new JSObject();
        ret.put("devices", deviceNames());
        call.resolve(ret);
    }

    @PluginMethod
    public void scanBluetooth(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "ble" : "bleLegacy";
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "onBlePermission");
            return;
        }
        startScan(call);
    }

    @PermissionCallback
    private void onBlePermission(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "ble" : "bleLegacy";
        if (getPermissionState(alias) == PermissionState.GRANTED) startScan(call);
        else call.reject("Bluetooth permission denied");
    }

    @SuppressLint("MissingPermission")
    private void startScan(PluginCall call) {
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth is off");
            return;
        }
        stopScan();
        scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            call.reject("Bluetooth LE is unavailable");
            return;
        }
        scanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice d = result.getDevice();
                JSObject ev = new JSObject();
                ev.put("address", d.getAddress());
                String name = result.getScanRecord() != null ? result.getScanRecord().getDeviceName() : null;
                ev.put("name", name != null ? name : d.getName());
                notifyListeners("bleDevice", ev);
            }
        };
        ScanFilter filter = new ScanFilter.Builder().setServiceUuid(MIDI_SERVICE).build();
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        scanner.startScan(Collections.singletonList(filter), settings, scanCallback);
        int seconds = call.getInt("seconds", 10);
        handler.postDelayed(this::stopScan, seconds * 1000L);
        call.resolve();
    }

    @SuppressLint("MissingPermission")
    private void stopScan() {
        if (scanner != null && scanCallback != null) {
            try {
                scanner.stopScan(scanCallback);
            } catch (Exception ignored) {}
        }
        scanCallback = null;
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void connectBluetooth(PluginCall call) {
        String address = call.getString("address");
        BluetoothAdapter adapter = adapter();
        if (address == null || adapter == null || midiManager == null) {
            call.reject("Bluetooth MIDI unavailable");
            return;
        }
        stopScan();
        BluetoothDevice device = adapter.getRemoteDevice(address);
        midiManager.openBluetoothDevice(
            device,
            d -> {
                if (d == null) {
                    call.reject("Could not open " + address);
                    return;
                }
                attach(d);
                JSObject ret = new JSObject();
                ret.put("devices", deviceNames());
                call.resolve(ret);
            },
            handler
        );
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return bm != null ? bm.getAdapter() : null;
    }

    private void openDevice(MidiDeviceInfo info) {
        int id = info.getId();
        if (info.getOutputPortCount() == 0 || openDevices.containsKey(id) || !opening.add(id)) return;
        midiManager.openDevice(
            info,
            d -> {
                opening.remove(id);
                if (d != null) attach(d);
            },
            handler
        );
    }

    private void attach(MidiDevice device) {
        if (destroyed) { closeQuietly(device); return; }
        MidiDeviceInfo info = device.getInfo();
        if (openDevices.containsKey(info.getId())) {
            if (openDevices.get(info.getId()) != device) closeQuietly(device);
            return;
        }
        List<MidiOutputPort> ports = new ArrayList<>();
        for (int i = 0; i < info.getOutputPortCount(); i++) {
            MidiOutputPort port = device.openOutputPort(i);
            if (port != null) { port.connect(new NoteReceiver()); ports.add(port); }
        }
        if (ports.isEmpty()) { closeQuietly(device); notifyDevices(); return; }
        inputPorts.put(info.getId(), ports);
        openDevices.put(info.getId(), device);
        notifyDevices();
    }

    private void closePorts(int id) {
        List<MidiOutputPort> ports = inputPorts.remove(id);
        if (ports != null) for (MidiOutputPort port : ports) {
            try { port.close(); } catch (IOException ignored) {}
        }
    }

    private JSArray deviceNames() {
        JSArray arr = new JSArray();
        synchronized (openDevices) {
            for (MidiDevice d : openDevices.values()) {
                String name = d.getInfo().getProperties().getString(MidiDeviceInfo.PROPERTY_NAME);
                arr.put(name != null ? name : "MIDI device");
            }
        }
        return arr;
    }

    private void notifyDevices() {
        JSObject ev = new JSObject();
        ev.put("devices", deviceNames());
        notifyListeners("devicesChanged", ev);
    }

    private static void closeQuietly(MidiDevice d) {
        if (d == null) return;
        try {
            d.close();
        } catch (IOException ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        destroyed = true;
        stopScan();
        if (midiManager != null && deviceCallback != null) midiManager.unregisterDeviceCallback(deviceCallback);
        synchronized (openDevices) {
            for (MidiDevice d : openDevices.values()) { closePorts(d.getInfo().getId()); closeQuietly(d); }
        }
        openDevices.clear();
    }

    /** Parses a MIDI byte stream (with running status) and emits note-on events. */
    private class NoteReceiver extends MidiReceiver {

        private int status = 0;
        private final int[] data = new int[2];
        private int count = 0;

        @Override
        public void onSend(byte[] msg, int offset, int length, long timestamp) {
            for (int i = offset; i < offset + length; i++) {
                int b = msg[i] & 0xFF;
                if (b >= 0xF8) continue; // real-time messages (clock, active sensing)
                if (b >= 0x80) {
                    status = b < 0xF0 ? b : 0;
                    count = 0;
                    continue;
                }
                if (status == 0) continue;
                data[count++] = b;
                int type = status & 0xF0;
                int needed = (type == 0xC0 || type == 0xD0) ? 1 : 2;
                if (count == needed) {
                    count = 0;
                    if (type == 0x90 && data[1] > 0) {
                        JSObject ev = new JSObject();
                        ev.put("note", data[0]);
                        ev.put("velocity", data[1]);
                        notifyListeners("noteOn", ev);
                    } else if (type == 0x80 || (type == 0x90 && data[1] == 0)) {
                        JSObject ev = new JSObject();
                        ev.put("note", data[0]);
                        notifyListeners("noteOff", ev);
                    } else if (type == 0xB0) {
                        // Control changes carry the pedals (64 sustain, 66 sostenuto, 67 soft).
                        JSObject ev = new JSObject();
                        ev.put("controller", data[0]);
                        ev.put("value", data[1]);
                        notifyListeners("controlChange", ev);
                    }
                }
            }
        }
    }
}
