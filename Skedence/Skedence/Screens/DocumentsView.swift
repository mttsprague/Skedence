//
//  DocumentsView.swift
//  Skedence
//
//  View for displaying user documents (waivers, agreements, etc.)
//

import SwiftUI
import FirebaseAuth

struct DocumentsView: View {
    @EnvironmentObject var auth: AuthManager
    @StateObject private var documentsService = DocumentsService.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if documentsService.isLoading {
                    ProgressView()
                        .padding(Spacing.xl)
                } else if documentsService.items.isEmpty {
                    emptyState
                } else {
                    ForEach(documentsService.items) { document in
                        documentCard(document)
                    }
                }
                
                if let error = documentsService.error {
                    errorView(error)
                }
            }
            .padding(Spacing.lg)
        }
        .background(Color.platformGroupedBackground)
        .navigationTitle("Documents")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if let userId = auth.currentUserDocId {
                try? await documentsService.fetch(userId: userId)
            }
        }
        .refreshable {
            if let userId = auth.currentUserDocId {
                try? await documentsService.fetch(userId: userId)
            }
        }
    }
    
    private var emptyState: some View {
        CardView(padding: Spacing.xl) {
            VStack(spacing: Spacing.md) {
                Image(systemName: "doc.text")
                    .font(.system(size: 56))
                    .foregroundStyle(AppTheme.textTertiary)
                
                Text("No Documents")
                    .font(.headingMedium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Your signed waivers and other documents will appear here.")
                    .font(.bodyMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }
    
    private func documentCard(_ document: UserDocument) -> some View {
        Button {
            if let url = URL(string: document.url) {
                UIApplication.shared.open(url)
            }
        } label: {
            HStack(spacing: Spacing.md) {
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                        .fill(AppTheme.primary.opacity(0.15))
                        .frame(width: 48, height: 48)
                    
                    Image(systemName: documentIcon(for: document.type))
                        .font(.system(size: 20))
                        .foregroundStyle(AppTheme.primary)
                }
                
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(document.displayName ?? document.name)
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.primary)
                        .multilineTextAlignment(.leading)
                    
                    Text("Signed \(document.uploadedAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(.labelMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                    
                    if let athleteName = document.athleteName {
                        Text("Athlete: \(athleteName)")
                            .font(.labelSmall)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(AppTheme.primary)
            }
        }
        .buttonStyle(.plain)
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous)
                .fill(Color.platformBackground)
        )
        .cardShadow()
    }
    
    private func errorView(_ error: Error) -> some View {
        CardView(padding: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(AppTheme.error)
                
                Text(error.localizedDescription)
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.error)
            }
        }
    }
    
    private func documentIcon(for type: String) -> String {
        switch type {
        case "waiver", "waiver_agreement":
            return "doc.text.fill"
        case "medical":
            return "cross.fill"
        default:
            return "doc.fill"
        }
    }
}
