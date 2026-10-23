import Foundation
var parser = MIDIByteParser()
func check(_ ok: Bool, _ message: String) { if !ok { fatalError(message) } }
check(parser.feed([0x90,60]).isEmpty,"Split message")
check(parser.feed([0xF8,100,61,0]).map(\.name)==["noteOn","noteOff"],"Running status, realtime and zero velocity")
check(parser.feed([0xB3,66,127,67,0]).map(\.values)==[["channel":3,"controller":66,"value":127],["channel":3,"controller":67,"value":0]],"Pedal CC")
check(parser.feed([0xF0,1,2,0xF8,3,0xF7,60,100]).isEmpty,"Ignore SysEx and orphan data")
check(parser.feed([0xC0,1,0xD0,2,0xF2,0,0,0x81,64,30]).map(\.name)==["noteOff"],"Non-note lengths")
var second=MIDIByteParser();check(second.feed([64,127]).isEmpty,"Independent endpoints")
print("Native MIDI decoder: all checks passed")
