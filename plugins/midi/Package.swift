// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "SpinoMidi", platforms: [.iOS(.v15)], products: [.library(name: "SpinoMidi", targets: ["MidiPlugin"])], dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.5.2")], targets: [.target(name: "MidiPlugin", dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")], path: "ios/Sources/MidiPlugin")])
