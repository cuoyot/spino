import Foundation
import UIKit
import UniformTypeIdentifiers
import CryptoKit
import Capacitor

@objc(CloudBackupPlugin)
public class CloudBackupPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "CloudBackupPlugin"
    public let jsName = "CloudBackup"
    public let pluginMethods: [CAPPluginMethod] = ["status", "create", "write", "disconnect", "pickBackup", "readRecovery", "readLinked", "saveRecovery", "acknowledgeSetup"].map {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }
    private let queue = DispatchQueue(label: "spino.cloud.backup")
    private let defaults = UserDefaults.standard
    private let prefix = "spino.cloud.backup."
    private let limit = 60_000_000
    private var pickerCall: CAPPluginCall?
    private var exporting = false
    private var temporaryURL: URL?

    private func failure(_ message: String) -> NSError { NSError(domain: "SPinoBackup", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    private func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
    private func bytes(_ call: CAPPluginCall) throws -> Data {
        guard let text = call.getString("text"), let data = text.data(using: .utf8), data.count <= limit else { throw failure("Backup content is missing or exceeds 60 MB.") }
        return data
    }
    private func recoveryURL() throws -> URL {
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("SPinoBackup", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var url = directory
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try url.setResourceValues(values)
        return directory.appendingPathComponent("last-good.json")
    }
    private func destination() throws -> URL {
        guard defaults.string(forKey: prefix + "device") == UIDevice.current.identifierForVendor?.uuidString else { throw failure("Choose a backup or shared notebook file on this device.") }
        guard let bookmark = defaults.data(forKey: prefix + "bookmark") else { throw failure("Choose a backup destination first.") }
        var stale = false
        let url = try URL(resolvingBookmarkData: bookmark, options: [.withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale)
        if stale {
            let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
            defaults.set(try url.bookmarkData(options: [.minimalBookmark], includingResourceValuesForKeys: nil, relativeTo: nil), forKey: prefix + "bookmark")
        }
        return url
    }
    private func read(_ url: URL) throws -> Data {
        let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
        var coordinationError: NSError?, result: Result<Data, Error>?
        NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { coordinated in
            result = Result {
                let handle = try FileHandle(forReadingFrom: coordinated); defer { try? handle.close() }
                var data = Data()
                while let chunk = try handle.read(upToCount: 16_384), !chunk.isEmpty {
                    guard data.count + chunk.count <= self.limit else { throw self.failure("The backup exceeds 60 MB.") }
                    data.append(chunk)
                }
                return data
            }
        }
        if let error = coordinationError { throw error }
        guard let result else { throw failure("The provider did not return a readable backup.") }
        return try result.get()
    }
    @objc public func acknowledgeSetup(_ call: CAPPluginCall) { call.resolve() }
    @objc public func status(_ call: CAPPluginCall) {
        call.resolve(["linked": defaults.data(forKey: prefix + "bookmark") != nil && defaults.string(forKey: prefix + "device") == UIDevice.current.identifierForVendor?.uuidString, "name": defaults.string(forKey: prefix + "name") ?? "", "lastHash": defaults.string(forKey: prefix + "hash") ?? ""])
    }
    @objc public func create(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pickerCall == nil else { call.reject("A file picker is already open."); return }
            do {
                let data = try self.bytes(call)
                let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let name = (call.getString("name") ?? "SPino-backup.json") as NSString
                let url = directory.appendingPathComponent(name.lastPathComponent)
                try data.write(to: url, options: [.atomic])
                self.temporaryURL = url; self.exporting = true; self.pickerCall = call
                // Move only the generated temporary snapshot to obtain access for later in-place updates.
                let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: false)
                picker.delegate = self
                guard let presenter = self.bridge?.viewController else { throw self.failure("No file picker presenter is available.") }
                presenter.present(picker, animated: true)
            } catch { self.cleanPicker(); call.reject(error.localizedDescription) }
        }
    }
    @objc public func pickBackup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pickerCall == nil else { call.reject("A file picker is already open."); return }
            guard let presenter = self.bridge?.viewController else { call.reject("No file picker presenter is available."); return }
            self.exporting = false; self.pickerCall = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json, .data], asCopy: false)
            picker.allowsMultipleSelection = false; picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickerCall?.resolve(["cancelled": true]); cleanPicker()
    }
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pickerCall, let url = urls.first else { cleanPicker(); return }
        let wasExporting = exporting
        queue.async {
            do {
                let value = try self.read(url)
                if wasExporting {
                    let original = try self.bytes(call)
                    guard self.hash(value) == self.hash(original) else { throw self.failure("The provider did not return the complete exported backup.") }
                    if call.getBool("link", true) == false {
                        call.resolve(["name": url.lastPathComponent])
                        DispatchQueue.main.async { self.cleanPicker() }
                        return
                    }
                    let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                    let bookmark = try url.bookmarkData(options: [.minimalBookmark], includingResourceValuesForKeys: nil, relativeTo: nil)
                    try value.write(to: self.recoveryURL(), options: [.atomic])
                    self.defaults.set(bookmark, forKey: self.prefix + "bookmark")
                    self.defaults.set(url.lastPathComponent, forKey: self.prefix + "name")
                    self.defaults.set(self.hash(value), forKey: self.prefix + "hash")
                    self.defaults.set(UIDevice.current.identifierForVendor?.uuidString, forKey: self.prefix + "device")
                    call.resolve(["name": url.lastPathComponent])
                } else {
                    guard let text = String(data: value, encoding: .utf8) else { throw self.failure("This backup is not UTF-8 JSON.") }
                    if call.getBool("link", false) {
                        let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                        let bookmark = try url.bookmarkData(options: [.minimalBookmark], includingResourceValuesForKeys: nil, relativeTo: nil)
                        self.defaults.set(bookmark, forKey: self.prefix + "bookmark")
                        self.defaults.set(url.lastPathComponent, forKey: self.prefix + "name")
                        self.defaults.set(self.hash(value), forKey: self.prefix + "hash")
                        self.defaults.set(UIDevice.current.identifierForVendor?.uuidString, forKey: self.prefix + "device")
                    }
                    call.resolve(["text": text, "name": url.lastPathComponent, "hash": self.hash(value)])
                }
            } catch { call.reject(error.localizedDescription, "PROVIDER_ERROR") }
            DispatchQueue.main.async { self.cleanPicker() }
        }
    }
    private func cleanPicker() {
        if let url = temporaryURL { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        temporaryURL = nil; pickerCall = nil
    }
    @objc public func write(_ call: CAPPluginCall) {
        queue.async {
            do {
                let url = try self.destination(), value = try self.bytes(call)
                let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                var coordinationError: NSError?, operationError: Error?, conflict = false
                NSFileCoordinator().coordinate(writingItemAt: url, options: [.forReplacing], error: &coordinationError) { coordinated in
                    do {
                        // Read and compare within the coordinated write; never blindly replace another device's data.
                        let size = try coordinated.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                        guard size <= self.limit else { throw self.failure("The backup exceeds 60 MB.") }
                        let previous = try Data(contentsOf: coordinated)
                        guard self.hash(previous) == call.getString("expectedHash") else { conflict = true; return }
                        try previous.write(to: self.recoveryURL(), options: [.atomic])
                        try value.write(to: coordinated, options: [.atomic])
                    } catch { operationError = error }
                }
                if conflict { call.reject("This file changed outside this device. Restore manually or create a separate backup; it has not been overwritten.", "CONFLICT"); return }
                if let error = coordinationError { throw error }
                if let error = operationError { throw error }
                guard self.hash(try self.read(url)) == self.hash(value) else { throw self.failure("The provider did not return the complete written backup. The local recovery copy is retained.") }
                self.defaults.set(self.hash(value), forKey: self.prefix + "hash")
                call.resolve(["providerAccepted": true])
            } catch { call.reject(error.localizedDescription, "PROVIDER_ERROR") }
        }
    }
    @objc public func readRecovery(_ call: CAPPluginCall) {
        queue.async {
            do { call.resolve(["text": String(data: try self.read(self.recoveryURL()), encoding: .utf8) ?? ""]) }
            catch { call.reject("No readable local recovery copy is available.") }
        }
    }
    @objc public func readLinked(_ call: CAPPluginCall) {
        queue.async {
            do { let value = try self.read(self.destination()); call.resolve(["text": String(data: value, encoding: .utf8) ?? "", "hash": self.hash(value)]) }
            catch { call.reject(error.localizedDescription, "PROVIDER_ERROR") }
        }
    }
    @objc public func saveRecovery(_ call: CAPPluginCall) {
        queue.async {
            do { try self.bytes(call).write(to: self.recoveryURL(), options: [.atomic]); call.resolve() }
            catch { call.reject(error.localizedDescription, "PROVIDER_ERROR") }
        }
    }
    @objc public func disconnect(_ call: CAPPluginCall) {
        queue.async {
            for key in ["bookmark", "name", "hash", "device"] { self.defaults.removeObject(forKey: self.prefix + key) }
            if let url = try? self.recoveryURL() { try? FileManager.default.removeItem(at: url) }
            call.resolve()
        }
    }
}
