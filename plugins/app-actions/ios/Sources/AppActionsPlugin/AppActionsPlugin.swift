import Capacitor
import StoreKit
import UIKit

@objc(SpinoAppActionsPlugin)
public class SpinoAppActionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpinoAppActionsPlugin"
    public let jsName = "AppActions"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "practiceScreenAwake", returnType: CAPPluginReturnPromise)]
    private var inactiveObserver: NSObjectProtocol?
    public override func load() {
        inactiveObserver = NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { _ in
            UIApplication.shared.isIdleTimerDisabled = false
        }
    }
    @objc func practiceScreenAwake(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled && UIApplication.shared.applicationState == .active
            call.resolve()
        }
    }
    deinit {
        if let inactiveObserver { NotificationCenter.default.removeObserver(inactiveObserver) }
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = false }
    }
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let scene = self?.bridge?.viewController?.view.window?.windowScene else { call.reject("App window unavailable."); return }
            SKStoreReviewController.requestReview(in: scene)
            // Apple decides whether to present the review sheet; this is a request, not proof of display.
            call.resolve()
        }
    }
}
