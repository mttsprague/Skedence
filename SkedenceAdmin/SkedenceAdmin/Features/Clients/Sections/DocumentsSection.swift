//
//  DocumentsSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct DocumentsSection: View {
    let documents: [ClientDocument]
    let isLoading: Bool
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Documents")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                
                if documents.isEmpty && !isLoading {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "doc.text")
                            .font(.system(size: 32))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No documents on file")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(documents) { document in
                            documentRow(document)
                            if document.id != documents.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func documentRow(_ document: ClientDocument) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: document.icon)
                .font(.system(size: 20))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(document.displayName)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.textPrimary)
                
                if let athleteName = document.athleteName {
                    Text("Athlete: \(athleteName)")
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textTertiary)
                }
                
                Text(document.uploadedAt.formatted(.relative(presentation: .named)))
                    .font(.labelSmall)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            
            Spacer()
            
            if document.url != nil {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
        .contentShape(Rectangle())
        .onTapGesture {
            if let urlString = document.url, let url = URL(string: urlString) {
                UIApplication.shared.open(url)
            }
        }
    }
}
