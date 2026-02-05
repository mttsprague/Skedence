//
//  ClientInfoSection.swift
//  SkedenceAdmin
//
//  Extracted from ClientCardView - Phase 1.2
//

import SwiftUI

struct ClientInfoSection: View {
    let client: Client
    
    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Client Header with Avatar
            clientHeader
                .padding(.top, Spacing.lg)
            
            // Contact Information
            contactSection
        }
    }
    
    private var clientHeader: some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.primary.opacity(0.8), AppTheme.primaryLight.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                
                Text(client.initials)
                    .font(.displaySmall)
                    .foregroundStyle(.white)
            }
            
            Text(client.fullName)
                .font(.headingLarge)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }
    
    private var contactSection: some View {
        CardView {
            HStack(spacing: Spacing.md) {
                // Email
                Link(destination: URL(string: "mailto:\(client.emailAddress)")!) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(AppTheme.primary)
                }
                
                // Phone
                Link(destination: URL(string: "tel:\(client.phoneNumber)")!) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(AppTheme.primary)
                }
                
                // Text Message
                Link(destination: URL(string: "sms:\(client.phoneNumber)")!) {
                    Image(systemName: "message.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(AppTheme.primary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(client.emailAddress)
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                    Text(client.phoneNumber)
                        .font(.labelSmall)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .padding(Spacing.md)
        }
        .padding(.horizontal, Spacing.lg)
    }
}
