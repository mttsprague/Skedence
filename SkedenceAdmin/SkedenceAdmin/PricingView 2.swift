import SwiftUI

struct PricingView: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedPlan: PricingPlan?
    let onPlanSelected: (PricingPlan) -> Void
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 12) {
                    Text("Choose Your Plan")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("All plans include email confirmations & reminders, booking links, and Stripe payments")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    Text("14-day free trial • Cancel anytime")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                        .fontWeight(.semibold)
                }
                .padding(.top)
                
                // Plans Grid
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 16),
                    GridItem(.flexible(), spacing: 16)
                ], spacing: 16) {
                    ForEach(PricingPlan.allPlans.filter { $0.id != "enterprise" }) { plan in
                        PricingCard(
                            plan: plan,
                            isSelected: selectedPlan?.id == plan.id,
                            onTap: {
                                selectedPlan = plan
                                onPlanSelected(plan)
                            }
                        )
                    }
                }
                .padding(.horizontal)
                
                // Enterprise Card (Full Width)
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Enterprise")
                                .font(.title2)
                                .fontWeight(.bold)
                            
                            Text("Custom pricing for large organizations")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Button("Contact Sales") {
                            // Open contact form
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 8) {
                        ForEach(PricingPlan.enterprise.features, id: \.self) { feature in
                            Label(feature, systemImage: "checkmark")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // Add-ons Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Add-Ons")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.horizontal)
                    
                    VStack(spacing: 12) {
                        ForEach(PricingAddOn.allAddOns) { addOn in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(addOn.name)
                                        .font(.headline)
                                    
                                    Text(addOn.description)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                                
                                Text("$\(Int(addOn.price))/mo")
                                    .font(.headline)
                                    .foregroundColor(.blue)
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.top)
            }
            .padding(.vertical)
        }
        .navigationTitle("Pricing")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PricingCard: View {
    let plan: PricingPlan
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    if plan.isPopular {
                        Text("MOST POPULAR")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue)
                            .cornerRadius(4)
                    }
                    
                    Text(plan.name)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text("$\(Int(plan.price))")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Text("/mo")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Divider()
                
                // Features
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(plan.features, id: \.self) { feature in
                        Label(feature, systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .labelStyle(FeatureCheckStyle())
                    }
                }
                
                Spacer()
                
                // CTA Button
                Text(isSelected ? "Selected" : "Start Free Trial")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(isSelected ? Color.green : Color.blue)
                    .cornerRadius(8)
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(plan.isPopular ? Color.blue.opacity(0.05) : Color(.systemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(plan.isPopular ? Color.blue : Color(.systemGray4), lineWidth: plan.isPopular ? 2 : 1)
            )
            .shadow(color: plan.isPopular ? Color.blue.opacity(0.2) : Color.clear, radius: 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FeatureCheckStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .top, spacing: 8) {
            configuration.icon
                .foregroundColor(.green)
            configuration.title
        }
    }
}

#Preview {
    NavigationView {
        PricingView { plan in
            print("Selected: \(plan.name)")
        }
    }
}
