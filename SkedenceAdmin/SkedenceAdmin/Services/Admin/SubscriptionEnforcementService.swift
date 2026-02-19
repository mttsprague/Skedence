import Foundation
import Combine
import FirebaseFirestore
import FirebaseAuth

@MainActor
class SubscriptionEnforcementService: ObservableObject {
    @Published var billing: OrganizationBilling?
    @Published var isOwner: Bool = false
    @Published var estimatedLostRevenue: Double = 0
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    deinit {
        listener?.remove()
    }
    
    func startMonitoring(organizationId: String) {
        listener = db.collection("organizations").document(organizationId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let data = snapshot?.data() else { return }
                
                
                // Parse billing data
                if let billingData = data["billing"] as? [String: Any] {
                    // Check if legacy data (missing isActive field)
                    let needsMigration = billingData["isActive"] == nil && billingData["status"] as? String == "active"
                    
                    self.billing = self.parseBilling(from: billingData)
                    
                    // Migrate legacy billing data
                    if needsMigration {
                        Task {
                            await self.migrateLegacyBilling(organizationId: organizationId)
                        }
                    }
                }
                
                // Check if current user is owner - query orgMembers collection
                if let userId = Auth.auth().currentUser?.uid {
                    Task {
                        await self.checkOwnerStatus(organizationId: organizationId, userId: userId)
                    }
                } else {
                    self.isOwner = false
                }
                
                // Calculate lost revenue if expired
                if let billing = self.billing, !billing.isActive {
                    Task {
                        await self.calculateLostRevenue(organizationId: organizationId)
                    }
                }
            }
    }
    
    private func checkOwnerStatus(organizationId: String, userId: String) async {
        do {
            let snapshot = try await db.collection("orgMembers")
                .whereField("userId", isEqualTo: userId)
                .whereField("orgId", isEqualTo: organizationId)
                .whereField("isActive", isEqualTo: true)
                .limit(to: 1)
                .getDocuments()
            
            if let doc = snapshot.documents.first,
               let role = doc.data()["role"] as? String {
                await MainActor.run {
                    self.isOwner = (role == "owner")
                }
            } else {
                await MainActor.run {
                    self.isOwner = false
                }
            }
        } catch {
            await MainActor.run {
                self.isOwner = false
            }
        }
    }
    
    private func migrateLegacyBilling(organizationId: String) async {
        do {
            let trialEndsAt = Calendar.current.date(byAdding: .day, value: 14, to: Date())!
            try await db.collection("organizations").document(organizationId).updateData([
                "billing.isActive": true,
                "billing.status": "trialing",
                "billing.trialEndsAt": Timestamp(date: trialEndsAt),
                "billing.isInGrace": false
            ])
        } catch {
        }
    }
    
    func stopMonitoring() {
        listener?.remove()
    }
    
    private func parseBilling(from data: [String: Any]) -> OrganizationBilling {
        let status = data["status"] as? String ?? "incomplete"
        let plan = data["plan"] as? String ?? "starter"
        
        // Handle legacy data: if isActive is missing but status is "active", treat as trial
        let isActive: Bool
        if let explicitActive = data["isActive"] as? Bool {
            isActive = explicitActive
        } else if status == "active" {
            // Legacy data - assume trial period
            isActive = true
        } else {
            isActive = false
        }
        
        let isInGrace = data["isInGrace"] as? Bool ?? false
        
        var trialEndsAt: Date?
        if let timestamp = data["trialEndsAt"] as? Timestamp {
            trialEndsAt = timestamp.dateValue()
        } else if status == "active" && data["isActive"] == nil {
            // Legacy data - set trial to 14 days from now
            trialEndsAt = Calendar.current.date(byAdding: .day, value: 14, to: Date())
        }
        
        var currentPeriodEnd: Date?
        if let timestamp = data["currentPeriodEnd"] as? Timestamp {
            currentPeriodEnd = timestamp.dateValue()
        }
        
        var graceEndsAt: Date?
        if let timestamp = data["graceEndsAt"] as? Timestamp {
            graceEndsAt = timestamp.dateValue()
        }
        
        return OrganizationBilling(
            status: status,
            plan: plan,
            trialEndsAt: trialEndsAt,
            currentPeriodEnd: currentPeriodEnd,
            graceEndsAt: graceEndsAt,
            stripeCustomerId: data["stripeCustomerId"] as? String,
            stripeSubscriptionId: data["stripeSubscriptionId"] as? String,
            isActive: isActive,
            isInGrace: isInGrace
        )
    }
    
    func canPerformAction(_ action: ProtectedAction) -> Bool {
        guard let billing = billing else { return false }
        
        switch action {
        case .viewSchedule, .viewClients, .viewPackages:
            return true // Always allow read operations
        case .createBooking, .editAvailability, .createPackage, .addTrainer, .sendInvite:
            return billing.canAcceptBookings
        }
    }
    
    func getActionBlockedMessage(_ action: ProtectedAction) -> String {
        guard let billing = billing else { return "Unable to load subscription status" }
        
        if billing.isPastDue {
            return "Payment failed — Update payment method to continue"
        }
        
        if billing.isCanceled {
            return "Account paused — Reactivate subscription to enable this feature"
        }
        
        return "Subscription inactive"
    }
    
    private func calculateLostRevenue(organizationId: String) async {
        // Calculate average revenue per week from last 30 days
        let thirtyDaysAgo = Date().addingTimeInterval(-30 * 24 * 60 * 60)
        
        do {
            let bookingsSnapshot = try await db.collection("bookings")
                .whereField("orgId", isEqualTo: organizationId)
                .whereField("startTime", isGreaterThan: Timestamp(date: thirtyDaysAgo))
                .getDocuments()
            
            let totalRevenue = bookingsSnapshot.documents.reduce(0.0) { sum, doc in
                return sum + (doc.data()["price"] as? Double ?? 0)
            }
            
            let avgRevenuePerWeek = totalRevenue / 4.3 // Approx weeks in 30 days
            estimatedLostRevenue = avgRevenuePerWeek
            
        } catch {
        }
    }
    
    nonisolated func createCheckoutSession(organizationId: String, priceId: String) async -> URL? {
        // Call Cloud Function to create Stripe Checkout session
        do {
            guard let userId = Auth.auth().currentUser?.uid else {
                return nil
            }
            
            let endpoint = "https://us-central1-polyface-ae6d3.cloudfunctions.net/createStripeCheckout"
            
            guard let url = URL(string: endpoint) else { return nil }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body: [String: Any] = [
                "organizationId": organizationId,
                "userId": userId,
                "priceId": priceId
            ]
            
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, _) = try await URLSession.shared.data(for: request)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            
            guard let urlString = json?["url"] as? String,
                  let checkoutUrl = URL(string: urlString) else {
                return nil
            }
            
            return checkoutUrl
            
        } catch {
            return nil
        }
    }
    
    func openBillingPortal(organizationId: String) async -> URL? {
        // Call your backend to generate Stripe billing portal session
        do {
            // Replace with your actual API endpoint
            let response = try await createBillingPortalSession(organizationId: organizationId)
            return response
        } catch {
            return nil
        }
    }
    
    private func createBillingPortalSession(organizationId: String) async throws -> URL? {
        // TODO: Implement API call to your backend
        // This should call Stripe to create a billing portal session
        // and return the URL
        return URL(string: "https://billing.stripe.com/session/xxx")
    }
}

enum ProtectedAction {
    case viewSchedule
    case viewClients
    case viewPackages
    case createBooking
    case editAvailability
    case createPackage
    case addTrainer
    case sendInvite
}
