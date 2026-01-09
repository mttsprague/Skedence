// CrashlyticsService.swift
import Foundation

#if canImport(FirebaseCrashlytics)
import FirebaseCrashlytics
#endif

final class CrashlyticsService {
    static let shared = CrashlyticsService()
    private init() {}

    func logError(_ error: Error, context: String? = nil, userInfo: [String: Any]? = nil) {
        #if canImport(FirebaseCrashlytics)
        if let context {
            Crashlytics.crashlytics().setCustomValue(context, forKey: "context")
        }
        if let userInfo {
            for (key, value) in userInfo {
                Crashlytics.crashlytics().setCustomValue(String(describing: value), forKey: key)
            }
        }
        Crashlytics.crashlytics().record(error: error)
        #else
        // Fallback: print so you still get diagnostics in debug builds
        let ctx = context.map { " [\($0)]" } ?? ""
        print("Crashlytics(logError)\(ctx): \(error)")
        if let userInfo {
            print("UserInfo: \(userInfo)")
        }
        #endif
    }

    func logMessage(_ message: String) {
        #if canImport(FirebaseCrashlytics)
        Crashlytics.crashlytics().log(message)
        #else
        print("Crashlytics(logMessage): \(message)")
        #endif
    }
}
