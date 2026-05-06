//
//  CancellationPolicyView.swift
//  Skedence
//

import SwiftUI

struct CancellationPolicyView: View {
    
    private let rules: [(icon: String, title: String, body: String)] = [
        (
            icon: "nosign",
            title: "No Refunds or Cancellations",
            body: "Once a session is booked, it cannot be cancelled or refunded. Each session is scheduled around coach availability and reserved gym time."
        ),
        (
            icon: "clock.fill",
            title: "48-Hour Reschedule Window",
            body: "You may request to reschedule your session, but only if the request is made at least 48 hours before the scheduled lesson time."
        ),
        (
            icon: "exclamationmark.triangle.fill",
            title: "Late Requests Are Not Accepted",
            body: "Any rescheduling request made less than 48 hours before your lesson will not be accepted. The session will be charged in full."
        ),
        (
            icon: "xmark.circle.fill",
            title: "No-Shows & Missed Sessions",
            body: "Missed sessions and no-shows are charged in full. PVA commits gym space, staffing, and preparation to every scheduled lesson."
        ),
    ]
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                
                // Hero
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("POLICIES")
                        .font(.labelSmall)
                        .fontWeight(.bold)
                        .foregroundStyle(.orange)
                        .tracking(2)
                    
                    Text("Cancellation &\nRescheduling")
                        .font(.displayMedium)
                        .foregroundStyle(AppTheme.primary)
                    
                    Text("Please review our policy carefully before booking. Each session reserves coach time and gym space.")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.top, Spacing.md)
                
                // Rules
                VStack(spacing: Spacing.md) {
                    ForEach(rules, id: \.title) { rule in
                        CardView {
                            HStack(alignment: .top, spacing: Spacing.md) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: CornerRadius.xs, style: .continuous)
                                        .fill(Color.orange.opacity(0.15))
                                        .frame(width: 48, height: 48)
                                    
                                    Image(systemName: rule.icon)
                                        .font(.system(size: 20))
                                        .foregroundStyle(.orange)
                                }
                                
                                VStack(alignment: .leading, spacing: Spacing.xs) {
                                    Text(rule.title)
                                        .font(.bodyMedium)
                                        .fontWeight(.bold)
                                        .foregroundStyle(AppTheme.primary)
                                    
                                    Text(rule.body)
                                        .font(.bodySmall)
                                        .foregroundStyle(AppTheme.textSecondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }
                }
                
                // Plain English Summary
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("IN PLAIN TERMS")
                        .font(.labelSmall)
                        .fontWeight(.bold)
                        .foregroundStyle(.orange)
                        .tracking(2)
                    
                    Text("There are no refunds or cancellations. You may reschedule **only if you request it at least 48 hours before your lesson.** After that, the session is locked in and will be charged in full — no exceptions.")
                        .font(.bodyMedium)
                        .foregroundStyle(AppTheme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(Spacing.lg)
                .background(AppTheme.primary.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md, style: .continuous))
                
                // Contact
                CardView {
                    HStack(spacing: Spacing.md) {
                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text("Questions about your session?")
                                .font(.bodyMedium)
                                .fontWeight(.bold)
                                .foregroundStyle(AppTheme.primary)
                            
                            Text("Reach out and we'll do our best to help.")
                                .font(.labelMedium)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        Spacer()
                        
                        Link(destination: URL(string: "mailto:Jeff@polyfacevolleyball.com")!) {
                            Text("Contact")
                                .font(.labelMedium)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, Spacing.md)
                                .padding(.vertical, Spacing.sm)
                                .background(.orange)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.xxxl)
        }
        .background(Color.platformGroupedBackground.ignoresSafeArea())
        .navigationTitle("Cancellation Policy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationView {
        CancellationPolicyView()
    }
}
