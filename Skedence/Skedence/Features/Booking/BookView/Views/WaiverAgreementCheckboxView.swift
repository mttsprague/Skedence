//
//  WaiverAgreementCheckboxView.swift
//  Skedence
//
//  Extracted from BookView.swift - Waiver agreement and signature flow
//

import SwiftUI
import UIKit

struct WaiverAgreementCheckboxView: View {
    let waiverText: String
    let userProfile: UserProfile?
    let onAgree: () -> Void
    let onCancel: () -> Void
    
    @State private var hasAgreed = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Liability Waiver")
                            .font(.displaySmall)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("Please read and agree to continue")
                            .font(.bodyMedium)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.top, Spacing.md)
                    
                    CardView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            ScrollView {
                                Text(waiverText.isEmpty ? "No waiver text configured." : waiverText)
                                    .font(.bodySmall)
                                    .foregroundStyle(AppTheme.textSecondary)
                                    .lineSpacing(4)
                            }
                            .frame(height: 400)
                            .padding(Spacing.sm)
                            .background(Color(UIColor.systemGray6))
                            .cornerRadius(CornerRadius.sm)
                        }
                    }
                    
                    if let profile = userProfile {
                        CardView {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "person.text.rectangle.fill")
                                        .foregroundStyle(AppTheme.primary)
                                        .font(.title3)
                                    Text("Parent/Guardian Information")
                                        .font(.headingSmall)
                                        .foregroundStyle(AppTheme.textPrimary)
                                }
                                
                                VStack(alignment: .leading, spacing: Spacing.sm) {
                                    if let firstName = profile.firstName, let lastName = profile.lastName {
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "person.fill")
                                                .foregroundStyle(AppTheme.textSecondary)
                                                .frame(width: 24)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text("Name").font(.caption).foregroundStyle(AppTheme.textSecondary)
                                                Text("\(firstName) \(lastName)").font(.bodyMedium).foregroundStyle(AppTheme.textPrimary)
                                            }
                                        }
                                    }
                                    
                                    if let email = profile.emailAddress, !email.isEmpty {
                                        Divider()
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "envelope.fill")
                                                .foregroundStyle(AppTheme.textSecondary)
                                                .frame(width: 24)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text("Email").font(.caption).foregroundStyle(AppTheme.textSecondary)
                                                Text(email).font(.bodyMedium).foregroundStyle(AppTheme.textPrimary)
                                            }
                                        }
                                    }
                                    
                                    if let phone = profile.phoneNumber, !phone.isEmpty {
                                        Divider()
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "phone.fill")
                                                .foregroundStyle(AppTheme.textSecondary)
                                                .frame(width: 24)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text("Phone").font(.caption).foregroundStyle(AppTheme.textSecondary)
                                                Text(phone).font(.bodyMedium).foregroundStyle(AppTheme.textPrimary)
                                            }
                                        }
                                    }
                                }
                                .padding(.top, Spacing.xs)
                            }
                        }
                        .background(Color(red: 0.95, green: 0.97, blue: 1.0))
                    }
                    
                    CardView {
                        Button {
                            hasAgreed.toggle()
                        } label: {
                            HStack(spacing: Spacing.sm) {
                                Image(systemName: hasAgreed ? "checkmark.square.fill" : "square")
                                    .font(.title2)
                                    .foregroundStyle(hasAgreed ? AppTheme.primary : AppTheme.textSecondary)
                                VStack(alignment: .leading, spacing: Spacing.xxs) {
                                    Text("I have read, understood, and agree to the terms above.")
                                        .font(.bodyMedium)
                                        .foregroundStyle(AppTheme.textPrimary)
                                        .multilineTextAlignment(.leading)
                                    if userProfile != nil {
                                        Text("By checking this box, I confirm the information above is correct and I agree on behalf of the participant(s).")
                                            .font(.caption)
                                            .foregroundStyle(AppTheme.textSecondary)
                                            .multilineTextAlignment(.leading)
                                    }
                                }
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    
                    Button {
                        onAgree()
                        // Don't dismiss here - let the parent view handle dismissal after waiver is saved
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "checkmark.circle.fill")
                            Text("I Agree")
                        }
                        .font(.headingSmall)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!hasAgreed)
                    .padding(.bottom, Spacing.xl)
                }
                .padding(.horizontal, Spacing.lg)
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Waiver Agreement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                        dismiss()
                    }
                }
            }
        }
    }
}
