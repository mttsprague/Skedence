//
//  AsyncButton.swift
//  Skedence
//
//  Phase 6: Button component with built-in async operation handling
//

import SwiftUI

/// Button that handles async operations with automatic loading state
struct AsyncButton<Label: View>: View {
    let action: () async throws -> Void
    let label: () -> Label
    
    @State private var isLoading = false
    @State private var error: Error?
    @State private var showError = false
    
    var body: some View {
        Button {
            Task {
                await performAction()
            }
        } label: {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    label()
                }
            }
        }
        .disabled(isLoading)
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = error {
                Text(error.localizedDescription)
            }
        }
    }
    
    private func performAction() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            try await action()
            error = nil
        } catch {
            self.error = error
            showError = true
        }
    }
}

// MARK: - Convenience Initializers
extension AsyncButton where Label == Text {
    /// Create async button with text label
    init(_ title: String, action: @escaping () async throws -> Void) {
        self.action = action
        self.label = { Text(title) }
    }
}

extension AsyncButton where Label == SwiftUI.Label<Text, Image> {
    /// Create async button with SF Symbol icon and text
    init(_ title: String, systemImage: String, action: @escaping () async throws -> Void) {
        self.action = action
        self.label = { Label(title, systemImage: systemImage) }
    }
}

// MARK: - Styled Variants
extension AsyncButton {
    /// Apply primary button style
    func primaryStyle() -> some View {
        self
            .font(.headingSmall)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(isLoading ? AppTheme.primary.opacity(0.7) : AppTheme.primary)
            .cornerRadius(CornerRadius.md)
    }
    
    /// Apply secondary button style
    func secondaryStyle() -> some View {
        self
            .font(.headingSmall)
            .foregroundStyle(AppTheme.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(Color(.systemGray6))
            .cornerRadius(CornerRadius.md)
    }
    
    /// Apply destructive button style
    func destructiveStyle() -> some View {
        self
            .font(.headingSmall)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(isLoading ? AppTheme.error.opacity(0.7) : AppTheme.error)
            .cornerRadius(CornerRadius.md)
    }
}

// MARK: - Preview
#Preview {
    VStack(spacing: Spacing.lg) {
        AsyncButton("Save Changes") {
            try await Task.sleep(nanoseconds: 2_000_000_000)
        }
        .primaryStyle()
        
        AsyncButton("Cancel", systemImage: "xmark") {
            try await Task.sleep(nanoseconds: 1_000_000_000)
        }
        .secondaryStyle()
        
        AsyncButton("Delete") {
            try await Task.sleep(nanoseconds: 1_500_000_000)
            throw NSError(domain: "TestError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Delete failed"])
        }
        .destructiveStyle()
        
        AsyncButton {
            try await Task.sleep(nanoseconds: 2_000_000_000)
        } label: {
            Label("Custom Button", systemImage: "star.fill")
        }
        .primaryStyle()
    }
    .padding()
}
