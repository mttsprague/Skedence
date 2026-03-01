//
//  LoadableView.swift
//  Skedence
//
//  Phase 6: Reusable view that handles all loading states
//

import SwiftUI

/// Generic view wrapper that handles loading states consistently
/// Automatically shows loading spinner, error, or content based on state
struct LoadableView<Content: View, Data>: View {
    let state: LoadingState<Data>
    let emptyMessage: String?
    let content: (Data) -> Content
    
    // Primary public initializer that supports ViewBuilder syntax.
    init(
        state: LoadingState<Data>,
        emptyMessage: String? = nil,
        @ViewBuilder content: @escaping (Data) -> Content
    ) {
        self.init(
            state: state,
            emptyMessage: emptyMessage,
            contentProvider: content
        )
    }
    
    // Disambiguating initializer without @ViewBuilder and with a different label.
    // This avoids recursive calls from convenience initializers.
    private init(
        state: LoadingState<Data>,
        emptyMessage: String?,
        contentProvider: @escaping (Data) -> Content
    ) {
        self.state = state
        self.emptyMessage = emptyMessage
        self.content = contentProvider
    }
    
    var body: some View {
        switch state {
        case .idle:
            if let message = emptyMessage {
                EmptyStateView(
                    icon: "tray",
                    title: message,
                    message: "Pull to refresh or try again later"
                )
            } else {
                Color.clear
            }
            
        case .loading:
            VStack(spacing: Spacing.lg) {
                ProgressView()
                    .scaleEffect(1.5)
                Text("Loading...")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
        case .success(let data):
            content(data)
            
        case .failure(let error):
            ErrorStateView(error: error)
        }
    }
}

// MARK: - Convenience Initializers
extension LoadableView where Content == AnyView, Data: Collection {
    /// Initialize with automatic empty state handling for collections
    init(
        state: LoadingState<Data>,
        emptyMessage: String? = nil,
        @ViewBuilder content: @escaping (Data) -> some View
    ) {
        self.init(state: state, emptyMessage: emptyMessage, contentProvider: { data in
            if data.isEmpty {
                AnyView(EmptyStateView(
                    icon: "tray",
                    title: emptyMessage ?? "No items",
                    message: "Check back later"
                ))
            } else {
                AnyView(content(data))
            }
        })
    }
}

// MARK: - Preview
#Preview("Success State") {
    LoadableView(state: .success(["Item 1", "Item 2", "Item 3"])) { items in
        List(items, id: \.self) { item in
            Text(item)
        }
    }
}

#Preview("Loading State") {
    LoadableView(state: .loading as LoadingState<[String]>) { items in
        List(items, id: \.self) { item in
            Text(item)
        }
    }
}

#Preview("Error State") {
    LoadableView(
        state: .failure(
            NSError(domain: "TestError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Network connection failed"])
        ) as LoadingState<[String]>
    ) { items in
        List(items, id: \.self) { item in
            Text(item)
        }
    }
}

#Preview("Empty State") {
    LoadableView(
        state: .idle as LoadingState<[String]>,
        emptyMessage: "No bookings yet"
    ) { items in
        List(items, id: \.self) { item in
            Text(item)
        }
    }
}
