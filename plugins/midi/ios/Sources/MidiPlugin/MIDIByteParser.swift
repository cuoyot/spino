import Foundation

struct MIDIInputEvent: Equatable {
    let name: String
    let values: [String: Int]
}

// One decoder per input endpoint: packets may split messages or omit repeated status bytes.
struct MIDIByteParser {
    private var status: UInt8 = 0
    private var data: [UInt8] = []
    private var sysex = false
    mutating func feed(_ bytes: [UInt8]) -> [MIDIInputEvent] {
        var events: [MIDIInputEvent] = []
        for byte in bytes {
            if byte >= 0xF8 { continue }
            if byte == 0xF0 { sysex = true; status = 0; data.removeAll(); continue }
            if byte == 0xF7 { sysex = false; status = 0; data.removeAll(); continue }
            if sysex { continue }
            if byte >= 0x80 { status = byte; data.removeAll(); continue }
            guard status != 0 else { continue }
            let kind = status & 0xF0
            let length = status < 0xF0 ? ([UInt8(0xC0), 0xD0].contains(kind) ? 1 : 2) : (status == 0xF2 ? 2 : ([UInt8(0xF1), 0xF3].contains(status) ? 1 : 0))
            guard length > 0 else { status = 0; continue }
            data.append(byte)
            guard data.count == length else { continue }
            if kind == 0x90 { events.append(MIDIInputEvent(name: data[1] == 0 ? "noteOff" : "noteOn", values: ["note": Int(data[0]), "velocity": Int(data[1])])) }
            else if kind == 0x80 { events.append(MIDIInputEvent(name: "noteOff", values: ["note": Int(data[0]), "velocity": Int(data[1])])) }
            else if kind == 0xB0 { events.append(MIDIInputEvent(name: "controlChange", values: ["controller": Int(data[0]), "value": Int(data[1])])) }
            data.removeAll()
            if status >= 0xF0 { status = 0 }
        }
        return events
    }
}
