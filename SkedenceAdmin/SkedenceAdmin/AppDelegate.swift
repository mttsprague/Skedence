//
//  AppDelegate.swift
//  SkedenceAdmin
//
//  Created by GitHub Copilot on 1/26/26.
//

import UIKit
import FirebaseCore
import FirebaseAppCheck

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // TEMPORARILY DISABLED: App Check to fix permission issues
        // TODO: Register debug token in Firebase Console after getting from logs
        // #if DEBUG
        // AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        // print("🔧 App Check: Using DEBUG provider")
        // #else
        // AppCheck.setAppCheckProviderFactory(DeviceCheckProviderFactory())
        // print("🔧 App Check: Using DeviceCheck provider")
        // #endif
        
        // Configure Firebase
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            print("🔧 Firebase: Configured")
        }
        
        return true
    }
}
