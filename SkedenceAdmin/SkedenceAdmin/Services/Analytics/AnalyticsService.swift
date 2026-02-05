// AnalyticsService.swift
import Foundation

#if canImport(FirebaseAnalytics)
import FirebaseAnalytics
#endif

final class AnalyticsService {
    static let shared = AnalyticsService()
    private init() {}

    func logScreenView(screenName: String, screenClass: String) {
        #if canImport(FirebaseAnalytics)
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName,
            AnalyticsParameterScreenClass: screenClass
        ])
        #else
        // Fallback: no-op or simple debug print
        #endif
    }
}
