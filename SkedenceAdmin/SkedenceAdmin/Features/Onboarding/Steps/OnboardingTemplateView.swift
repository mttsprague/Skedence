import SwiftUI

struct OnboardingTemplateView: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedTemplate: SportTemplate?
    let onTemplateSelected: (SportTemplate) -> Void
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Choose Your Sport")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("We'll set up packages and defaults that work best for your business")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    
                    VStack(spacing: 16) {
                        ForEach(SportTemplate.templates) { template in
                            TemplateCard(
                                template: template,
                                isSelected: selectedTemplate?.id == template.id,
                                onTap: { selectedTemplate = template }
                            )
                        }
                    }
                    .padding(.horizontal)
                    
                    if let template = selectedTemplate {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("What's Included")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Label("\(template.packageTemplates.count) pre-configured packages", systemImage: "shippingbox.fill")
                                Label("Smart cancellation policy (\(template.defaultCancellationHours)h)", systemImage: "calendar.badge.clock")
                                Label("Automated reminder schedule", systemImage: "bell.fill")
                                Label("Common session durations", systemImage: "clock.fill")
                            }
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        }
                        .padding(.vertical)
                        .background(Color(.systemBackground))
                    }
                }
                .padding(.vertical)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Continue") {
                        if let template = selectedTemplate {
                            onTemplateSelected(template)
                            dismiss()
                        }
                    }
                    .disabled(selectedTemplate == nil)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

struct TemplateCard: View {
    let template: SportTemplate
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                Text(template.icon)
                    .font(.system(size: 48))
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(template.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(template.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.blue.opacity(0.1) : Color(.systemGray6))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    OnboardingTemplateView { template in
    }
}
