//
//  AppDelegate.swift
//  SkedenceAdmin
//
//  Created by GitHub Copilot on 1/26/26.
//

import UIKit
import FirebaseCore

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Configure Firebase BEFORE anything else
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            print("🔥 Firebase configured in AppDelegate (EARLIEST)")
        }
        return true
    }
}
