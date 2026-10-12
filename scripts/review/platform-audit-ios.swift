// Test-only screenshot driver for disposable audit simulators. Never install in a release project.
import UIKit
import Capacitor
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SPinoBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

private class SPinoBridgeViewController: CAPBridgeViewController {
    #if DEBUG && targetEnvironment(simulator)
    private var auditDriver: PlatformAuditDriver?
    #endif
    override func capacitorDidLoad() {
        #if DEBUG && targetEnvironment(simulator)
        // iOS 27 simulator inspection can stall navigation before the HTML is parsed.
        if #available(iOS 27.0, *) {
            webView?.isInspectable = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            guard let self else { return }
            if #available(iOS 16.4, *) { self.webView?.isInspectable = false }
            self.auditDriver = PlatformAuditDriver(self)
        }
        #endif
    }
}


#if DEBUG && targetEnvironment(simulator)
private class PlatformAuditDriver {
    private weak var controller: CAPBridgeViewController?
    private let device = ProcessInfo.processInfo.environment["SPINO_AUDIT_DEVICE"] ?? "ios-unknown"
    private let endpoint = "http://127.0.0.1:8767"
    init(_ controller: CAPBridgeViewController) {
        self.controller = controller
        let script = "window.__auditBootToken=sessionStorage.getItem('auditGeneration');window.__auditErrors=[];window.addEventListener('error',e=>window.__auditErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.__auditErrors.push(String(e.reason)));const AuditDate=Date;window.Date=class extends AuditDate{constructor(...args){super(...(args.length?args:['2026-10-01T10:00:00Z']))}static now(){return 1790848800000}};let auditSeed=123456;Math.random=()=>((auditSeed=(auditSeed*1664525+1013904223)>>>0)/4294967296);"
        controller.webView?.configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { self.poll() }
    }
    private func poll() {
        guard let url = URL(string: endpoint + "/next?device=" + device) else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self else { return }
            guard let data, let command = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let id = command["id"] as? Int else { self.again(); return }
            DispatchQueue.main.async {
                guard let controller = self.controller else { return }
                if #available(iOS 16.0, *), let orientation = command["orientation"] as? String, let scene = controller.view.window?.windowScene {
                    scene.requestGeometryUpdate(.iOS(interfaceOrientations: orientation == "landscape" ? .landscapeLeft : .portrait)) { error in NSLog("Audit orientation: %@", error.localizedDescription) }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.report(id, value: true, error: nil) }
                    return
                }
                if command["nativeState"] as? Bool == true {
                    let presented = controller.presentedViewController
                    self.report(id, value: ["presented": presented.map { String(describing: type(of: $0)) } ?? "", "presenting": presented?.isBeingPresented ?? false], error: nil)
                    return
                }
                if command["dismiss"] as? Bool == true {
                    if let picker = controller.presentedViewController as? UIDocumentPickerViewController {
                        picker.delegate?.documentPickerWasCancelled?(picker)
                        picker.dismiss(animated: false)
                    }
                    controller.view.endEditing(true)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { self.report(id, value: true, error: nil) }
                    return
                }
                if command["reload"] as? Bool == true {
                    controller.webView?.reload()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.report(id, value: true, error: nil) }
                    return
                }
                let expression = command["script"] as? String ?? "true"
                controller.webView?.callAsyncJavaScript("return await (" + expression + ");", arguments: [:], in: nil, in: .page) { result in
                    switch result {
                    case .success(let value): self.report(id, value: value, error: nil)
                    case .failure(let error): self.report(id, value: NSNull(), error: String(describing: (error as NSError).userInfo))
                    }
                }
            }
        }.resume()
    }
    private func again() { DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) { self.poll() } }
    private func report(_ id: Int, value: Any?, error: String?) {
        var payload: [String: Any] = ["id": id, "value": value ?? NSNull(), "device": device]
        if let error { payload["error"] = error }
        guard JSONSerialization.isValidJSONObject(payload), let data = try? JSONSerialization.data(withJSONObject: payload), let url = URL(string: endpoint + "/result") else { again(); return }
        var request = URLRequest(url: url); request.httpMethod = "POST";request.httpBody = data
        URLSession.shared.dataTask(with: request) { _,_,_ in self.again() }.resume()
    }
}
#endif
