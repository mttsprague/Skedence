//
//  LocationCard.swift
//  Skedence
//
//  Extracted from HomeView.swift - Location display card
//

import SwiftUI
import MapKit

struct LocationCard: View {
    let location: Location
    let onTap: () -> Void
    
    var body: some View {
        CardView(padding: Spacing.md) {
            Button {
                onTap()
            } label: {
                HStack(spacing: Spacing.md) {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [AppTheme.primary, AppTheme.primaryLight],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing)
                            )
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: 26))
                            .foregroundStyle(.white)
                    }

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(location.name)
                            .font(.headingSmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        
                        Text(location.addressLine1)
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                        
                        Text(location.cityStateZip)
                            .font(.bodySmall)
                            .foregroundStyle(AppTheme.textTertiary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(AppTheme.primary.opacity(0.3))
                }
            }
            .buttonStyle(.plain)
        }
    }
}
