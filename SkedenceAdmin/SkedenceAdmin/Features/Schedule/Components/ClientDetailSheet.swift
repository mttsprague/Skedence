//
//  ClientDetailSheet.swift
//  SkedenceAdmin
//
//  Shared sheet for displaying client details in schedule views
//

import SwiftUI

struct ClientDetailSheet: View {
    let client: Client

    var body: some View {
        VStack(spacing: 16) {
            if let urlString = client.photoURL, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: 72, height: 72)
                            .clipShape(Circle())
                            .transition(.opacity)
                    case .empty, .failure:
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 72, height: 72)
                            .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 36)).foregroundStyle(.secondary))
                    @unknown default:
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 72, height: 72)
                            .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 36)).foregroundStyle(.secondary))
                    }
                }
            } else {
                Circle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 72, height: 72)
                    .overlay(Image(systemName: "person.crop.circle.fill").font(.system(size: 36)).foregroundStyle(.secondary))
            }

            VStack(spacing: 4) {
                Text(client.fullName)
                    .font(.title3.weight(.semibold))
                if !client.emailAddress.isEmpty {
                    Link(destination: URL(string: "mailto:\(client.emailAddress)")!) {
                        HStack(spacing: 4) {
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 12))
                            Text(client.emailAddress)
                                .font(.subheadline)
                        }
                        .foregroundStyle(AppTheme.primary)
                    }
                }
                if !client.phoneNumber.isEmpty {
                    VStack(spacing: Spacing.xs) {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 12))
                            Text(client.phoneNumber)
                                .font(.subheadline)
                        }
                        .foregroundStyle(.secondary)
                        
                        InlinePhoneActions(phoneNumber: client.phoneNumber)
                    }
                    .padding(.top, Spacing.xxs)
                }
            }

            Spacer()
        }
        .padding()
        .presentationDragIndicator(.visible)
    }
}
