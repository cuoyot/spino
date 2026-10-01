// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SpinoCloudBackup",
    platforms: [.iOS(.v15)],
    products: [.library(name: "SpinoCloudBackup", targets: ["CloudBackupPlugin"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.5.2")],
    targets: [.target(name: "CloudBackupPlugin", dependencies: [.product(name: "Capacitor", package: "capacitor-swift-pm")], path: "ios/Sources/CloudBackupPlugin", resources: [.process("PrivacyInfo.xcprivacy")])]
)
