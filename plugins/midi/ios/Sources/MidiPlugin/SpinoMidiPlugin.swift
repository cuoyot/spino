import Capacitor
import CoreMIDI
import CoreAudioKit
import UIKit

@objc(SpinoMidiPlugin)
public class SpinoMidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpinoMidiPlugin"
    public let jsName = "Midi"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "openAll", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "showBluetoothPicker", returnType: CAPPluginReturnPromise)]
    private let queue = DispatchQueue(label: "com.miguecoll.spino.midi")
    private var client = MIDIClientRef()
    private var input = MIDIPortRef()
    private var sources: Set<MIDIEndpointRef> = []
    private var decoders: [MIDIEndpointRef: MIDIByteParser] = [:]
    private var names: [String] = []

    public override func load() {
        queue.async { [weak self] in try? self?.start() }
    }
    private func start() throws {
        if client == 0 {
            let status = MIDIClientCreateWithBlock("SPino MIDI" as CFString, &client) { [weak self] _ in self?.queue.async { [weak self] in self?.refreshSources() } }
            guard status == noErr else { throw NSError(domain: "SPinoMIDI", code: Int(status)) }
            let portStatus = MIDIInputPortCreateWithBlock(client, "SPino input" as CFString, &input) { [weak self] packets, context in
                guard let self, let context else { return }
                let source = MIDIEndpointRef(UInt(bitPattern: context))
                var bytes: [UInt8] = []
                var packet = UnsafeRawPointer(packets).advanced(by: MemoryLayout<MIDIPacketList>.offset(of: \.packet)!).assumingMemoryBound(to: MIDIPacket.self)
                for _ in 0..<packets.pointee.numPackets {
                    let start = UnsafeRawPointer(packet).advanced(by: MemoryLayout<MIDIPacket>.offset(of: \.data)!).assumingMemoryBound(to: UInt8.self)
                    bytes.append(contentsOf: UnsafeBufferPointer(start: start, count: Int(packet.pointee.length)))
                    packet = UnsafePointer(MIDIPacketNext(packet))
                }
                self.queue.async { [weak self] in self?.receive(bytes, from: source) }
            }
            guard portStatus == noErr else { MIDIClientDispose(client); client = 0; throw NSError(domain: "SPinoMIDI", code: Int(portStatus)) }
        }
        refreshSources()
    }
    private func receive(_ bytes: [UInt8], from source: MIDIEndpointRef) {
        guard sources.contains(source) else { return }
        var parser = decoders[source] ?? MIDIByteParser()
        let events = parser.feed(bytes); decoders[source] = parser
        DispatchQueue.main.async { [weak self] in
            for event in events { self?.notifyListeners(event.name, data: event.values) }
        }
    }
    private func refreshSources() {
        guard input != 0 else { return }
        let present = Set((0..<MIDIGetNumberOfSources()).map { MIDIGetSource($0) }.filter { $0 != 0 })
        for source in sources.subtracting(present) { MIDIPortDisconnectSource(input, source); decoders.removeValue(forKey: source) }
        sources.formIntersection(present)
        for source in present.subtracting(sources) {
            if MIDIPortConnectSource(input, source, UnsafeMutableRawPointer(bitPattern: Int(source))) == noErr { sources.insert(source) }
        }
        let updated = sources.sorted().map { source -> String in
            var property: Unmanaged<CFString>?
            if MIDIObjectGetStringProperty(source, kMIDIPropertyDisplayName, &property) == noErr, let property { return property.takeRetainedValue() as String }
            return "MIDI input"
        }
        if updated != names {
            names = updated
            DispatchQueue.main.async { [weak self] in self?.notifyListeners("devicesChanged", data: ["devices": updated]) }
        }
    }
    @objc func openAll(_ call: CAPPluginCall) {
        queue.async { [weak self] in
            guard let self else { return }
            do { try self.start(); let devices = self.names; DispatchQueue.main.async { call.resolve(["devices": devices]) } }
            catch { DispatchQueue.main.async { call.reject("Could not open MIDI inputs.", "MIDI_UNAVAILABLE", error) } }
        }
    }
    @objc func showBluetoothPicker(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let controller = self.bridge?.viewController, controller.presentedViewController == nil else { call.reject("Close the current dialog before connecting Bluetooth MIDI."); return }
            let picker = CABTMIDICentralViewController()
            let navigation = UINavigationController(rootViewController: picker)
            picker.navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Done", style: .done, target: self, action: #selector(self.closeBluetoothPicker))
            controller.present(navigation, animated: true) { call.resolve() }
        }
    }
    @objc private func closeBluetoothPicker() { bridge?.viewController?.dismiss(animated: true) }
    deinit {
        if input != 0 { MIDIPortDispose(input) }
        if client != 0 { MIDIClientDispose(client) }
    }
}
