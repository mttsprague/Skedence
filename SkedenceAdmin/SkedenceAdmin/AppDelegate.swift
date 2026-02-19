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
        // CRITICAL: Set App Check provider BEFORE Firebase configuration
        #if DEBUG
        // Use debug provider in development
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #else
        // Use DeviceCheck provider in production
        AppCheck.setAppCheckProviderFactory(AppAttestProviderFactory())
        #endif
        
        // Configure Firebase AFTER setting App Check provider
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        
        return true
    }
}
