# iOS development on macOS

SPino already includes a Capacitor 8 iOS project. Use Node.js 22.13 or later and Xcode 26 or later. The native project uses Swift Package Manager; CocoaPods is not required.

## Prepare the Mac

Install Xcode from the Mac App Store. Launch it, complete its first-run setup, and install the iOS platform and a simulator runtime when prompted. If command-line tools still point to `/Library/Developer/CommandLineTools`, select Xcode:

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcodebuild -version
xcrun simctl list devices available
```

Install Node 22 using your preferred version manager. With Homebrew:

```sh
brew install node@22
export PATH="$(brew --prefix node@22)/bin:$PATH"
node --version
```

The PATH command applies to the current terminal. Add it to your shell configuration to use Node 22 in future terminals. With nvm, run `nvm install` and `nvm use` from the repository instead; `.nvmrc` selects Node 22.

## Prepare and run SPino

From the repository root:

```sh
npm ci
npm run ios:sync
npm run ios:open
```

In Xcode, select the App scheme and an iPhone or iPad simulator, then run. Swift Package Manager resolves Capacitor and the local cloud-backup package. A simulator build does not require a signing team.

After web changes, run `npm run ios:sync` and run the app again. To select and launch a native target from the terminal, use `npm run ios:run`. `npm run dev` serves the browser app and does not update an installed native build.

For a physical device, select your development team under Signing & Capabilities, connect the device, and complete any trust and Developer Mode prompts. Use a disposable synthetic notebook for development and review; preserve personal notebooks, PDFs, and annotations.

## Platform verification

An existing iOS project and successful web synchronization do not establish Swift compilation or device acceptance. Native MIDI, reminders, and immersive system-bar handling currently have Android-specific implementations. Validate iOS behavior separately. See [cloud backup](cloud-backup.md) for Files provider and device validation requirements.

## Local setup verified on October 10, 2026

Node 22.23.3, Xcode 27.0 (27A266a), and the iOS 27.0 simulator runtime are installed. The Debug simulator build passed, including the local Swift cloud-backup plugin, with signing disabled. A separate `SPino Development iPhone` simulator uses the iPhone 18 Pro device type. Xcode's Device Hub displays the simulator on this installation.

To rebuild the native app without signing:

```sh
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm run ios:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=SPino Development iPhone' -derivedDataPath /tmp/spino-ios-development build CODE_SIGNING_ALLOWED=NO
```

Physical-device signing and actual cloud file providers still require separate validation.

### iOS 27 simulator blank-screen diagnosis

The initial Debug build remained white before parsing the app HTML. Temporary native probes showed a successful read of the bundled `index.html`, but the document stayed at `about:blank` with navigation pending. A 108-byte HTML page without app JavaScript also reproduced the failure, including with all injected user scripts removed. There are no Cordova splashscreen or statusbar plugins: the generated Cordova scripts are empty. Loading HTML directly in a plain WKWebView succeeded, as did a plain WKWebView using Capacitor's local asset handler.

Disabling `WKWebView.isInspectable` allowed the full app to complete loading and display Today. The final workaround in `SceneDelegate.swift` applies only to Debug builds in the iOS 27-or-later simulator. It preserves Capacitor's navigation and UI delegates, injected scripts, local backup plugin, and original start URL. Safari Web Inspector is unavailable for this simulator WebView while the workaround is active; native Xcode debugging remains available. Physical-device and Release builds do not apply this workaround. The underlying WebKit inspection defect has not been independently isolated upstream.

Validation: the final native Debug build passed and the installed app displayed Today using an empty development notebook. Temporary diagnostic controllers and HTML fixtures were removed. Local screenshot evidence is in `artifacts/ios-development/2026-10-10/startup-fixed.png`; this is simulator startup evidence, not physical-device or responsive-layout acceptance.

### Upstream update on October 10, 2026

Updated `master` from `ad0d9dd` to `46160c4` (package version 5.2.7) and reapplied the local iOS scripts, Node selection, and simulator inspection workaround without conflicts. `npm ci`, the production web build, Capacitor iOS synchronization, and the native Debug simulator build passed. Replacement installation retained the existing simulator notebook. The updated app launched and displayed Practice with the new quick-practice and Progress surfaces. Screenshot evidence is in `artifacts/ios-development/2026-10-10-upstream-46160c4/startup-loaded.png`. This verifies compilation and startup, not all newly added features or physical-device behavior.

The pre-update local changes remain recoverable in the Git stash named `iOS development setup before upstream update 2026-10-10`.
