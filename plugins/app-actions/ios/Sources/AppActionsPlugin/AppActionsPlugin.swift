import Capacitor
import StoreKit
import UIKit

@objc(SpinoAppActionsPlugin)
public class SpinoAppActionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpinoAppActionsPlugin"
    public let jsName = "AppActions"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)]
    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let scene = self?.bridge?.viewController?.view.window?.windowScene else { call.reject("App window unavailable."); return }
            SKStoreReviewController.requestReview(in: scene)
            // Apple decides whether to present the review sheet; this is a request, not proof of display.
            call.resolve()
        }
    }
}
