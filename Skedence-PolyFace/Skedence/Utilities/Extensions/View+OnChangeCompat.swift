//
//  View+OnChangeCompat.swift
//  Skedence
//
//  iOS 17 onChange compatibility extension
//

import SwiftUI

// Single-parameter convenience overload that coexists with the (oldValue, newValue)
// overload defined elsewhere (e.g., in DesignSystem.swift). This avoids duplicate
// global definitions of the same signature that cause ambiguity.
extension View {
    @ViewBuilder
    func onChangeCompat<V: Equatable>(
        of value: V,
        perform action: @escaping (V) -> Void
    ) -> some View {
        if #available(iOS 17.0, macOS 14.0, watchOS 10.0, tvOS 17.0, visionOS 1.0, *) {
            self.onChange(of: value) { _, newValue in
                action(newValue)
            }
        } else {
            self.onChange(of: value, perform: action)
        }
    }
}
