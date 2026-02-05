//
//  WalletSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct WalletSection: View {
    let paymentMethods: [PaymentMethodInfo]
    let isLoading: Bool
    
    var body: some View {
        CardView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text("Saved Cards")
                        .font(.headingSmall)
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                
                if paymentMethods.isEmpty && !isLoading {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 24))
                            .foregroundStyle(AppTheme.textTertiary)
                        
                        Text("No cards saved")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Spacer()
                    }
                    .padding(.vertical, Spacing.xs)
                } else {
                    VStack(spacing: Spacing.sm) {
                        ForEach(paymentMethods) { card in
                            savedCardRow(card)
                            if card.id != paymentMethods.last?.id {
                                Divider()
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func savedCardRow(_ card: PaymentMethodInfo) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 24))
                .foregroundStyle(AppTheme.primary)
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text("\(card.brand.capitalized)")
                    .font(.labelMedium)
                    .foregroundStyle(AppTheme.textSecondary)
                Text("•••• \(card.last4)")
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.textPrimary)
            }
            
            Spacer()
            
            Text("\(card.expMonth)/\(card.expYear)")
                .font(.bodySmall)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(.vertical, Spacing.xs)
    }
}
