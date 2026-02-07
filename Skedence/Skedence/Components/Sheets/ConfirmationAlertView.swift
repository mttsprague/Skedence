//
//  ConfirmationAlertView.swift
//  Skedence
//
//  Custom alert-style confirmation dialog
//

import SwiftUI

struct ConfirmationAlertView: View {
    let title: String
    let message: String
    let confirmButtonText: String
    let onConfirm: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            
            VStack(spacing: 20) {
                Text(title)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
                
                Text(message)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                
                VStack(spacing: 12) {
                    Button {
                        onConfirm()
                    } label: {
                        Text(confirmButtonText)
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Brand.primary)
                            .clipShape(Capsule())
                    }
                    
                    Button {
                        onCancel()
                    } label: {
                        Text("Cancel")
                            .font(.headline)
                            .foregroundStyle(Brand.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.clear)
                    }
                }
            }
            .padding(24)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.platformBackground)
                    .shadow(color: .black.opacity(0.15), radius: 20, x: 0, y: 10)
            )
            .padding(.horizontal, 40)
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.4))
        .ignoresSafeArea()
    }
}
