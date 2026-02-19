//
//  TrainerBioSheet.swift
//  Skedence
//
//  Created by GitHub Copilot
//

import SwiftUI

struct TrainerBioSheet: View {
    @Environment(\.dismiss) var dismiss
    let trainer: Trainer
    
    var body: some View {
        NavigationView {
            ZStack {
                // Test with bright red background
                Color.red
                    .ignoresSafeArea()
                
                VStack(spacing: 20) {
                    Text("TRAINER BIO SHEET")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text("Name: \(trainer.name ?? "Unknown")")
                        .font(.title2)
                        .foregroundColor(.white)
                    
                    Text("Email: \(trainer.email ?? "No email")")
                        .font(.body)
                        .foregroundColor(.white)
                    
                    Text("Bio: \(trainer.trainerDescription ?? "No bio")")
                        .font(.body)
                        .foregroundColor(.white)
                        .padding()
                    
                    Button("Close") {
                        dismiss()
                    }
                    .font(.title2)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
                }
                .padding()
            }
            .navigationTitle("Debug View")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
