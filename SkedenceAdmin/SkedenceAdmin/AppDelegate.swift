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
        #if DEBUG
        // Use App Check debug provider in debug builds. This prints a debug token to the console.
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #endif
        // Configure Firebase BEFORE anything else
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        return true
    }
}
