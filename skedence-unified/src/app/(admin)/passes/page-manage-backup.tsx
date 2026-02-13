'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Minus, Package, User } from 'lucide-react';
import { logPassIssued } from '@/lib/activity-logger';

interface Client {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface PackageOption {
  id: string;
  title: string;
  priceInCents: number;
  packageType: string;
  packageCategory: 'oneAthlete' | 'twoAthlete' | 'threeAthlete' | 'fourAthlete' | 'classPass';
  lessonCount?: number; // Number of passes in the package
  expirationDays: number; // Days until expiration after purchase
}

// Helper function to get display name for package category
function getCategoryDisplayName(category: string): string {
  switch (category) {
    case 'oneAthlete':
      return '1 Athlete';
    case 'twoAthlete':
      return '2 Athletes';
    case 'threeAthlete':
      return '3 Athletes';
    case 'fourAthlete':
      return '4 Athletes';
    case 'classPass':
    case 'class':
      return 'Class';
    case 'pass':
      return 'Pass';
    default:
      return category;
  }
}

// Group packages by category
function groupPackagesByCategory(packages: PackageOption[]): Array<{category: string; displayName: string; packages: PackageOption[]}> {
  const grouped = new Map<string, PackageOption[]>();
  
  packages.forEach(pkg => {
    const category = pkg.packageCategory || 'pass';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(pkg);
  });
  
  // Sort categories: 1 athlete, 2 athlete, 3 athlete, 4 athlete, then class
  const categoryOrder = ['oneAthlete', 'twoAthlete', 'threeAthlete', 'fourAthlete', 'classPass', 'class', 'pass'];
  
  const result: Array<{category: string; displayName: string; packages: PackageOption[]}> = [];
  categoryOrder.forEach(category => {
    if (grouped.has(category)) {
      const categoryPackages = grouped.get(category)!;
      // Sort packages within category by lessonCount
      categoryPackages.sort((a, b) => (a.lessonCount || 1) - (b.lessonCount || 1));
      result.push({
        category,
        displayName: getCategoryDisplayName(category),
        packages: categoryPackages
      });
    }
  });
  
  return result;
}

interface LessonPackage {
  id: string;
  packageType: string;
  packageCategory: string;
  packageName?: string;
  totalLessons: number;
  lessonsUsed: number;
  remainingLessons?: number;
  purchaseDate: any;
  expirationDate: any;
  transactionId: string;
}

export default function PassesPage() {
  const { orgId, user, userData } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientPackages, setClientPackages] = useState<LessonPackage[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function loadData() {
      try {
        if (!orgId) return; // Type guard
        
        // Load clients from orgMembers (matching iOS AdminService.loadAllUsers)
        const membersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId),
          where('role', '==', 'client'),
          where('isActive', '==', true)
        );
        const membersSnap = await getDocs(membersQuery);
        
        // Load full user data for each member
        const clientsData: Client[] = [];
        for (const memberDoc of membersSnap.docs) {
          const memberData = memberDoc.data();
          const userId = memberData.userId;
          
          if (userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                clientsData.push({
                  id: memberDoc.id,
                  userId: userId,
                  firstName: userData.firstName || '',
                  lastName: userData.lastName || '',
                  email: userData.email || ''
                });
              }
            } catch (err) {
              console.warn('Could not load user data for', userId, err);
            }
          }
        }
        
        setClients(clientsData.sort((a, b) => a.lastName.localeCompare(b.lastName)));

        // Load pricing structure from organization document field (matching iOS PricingStructureService)
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          const pricingData = orgData.pricingStructure;
          
          if (pricingData && pricingData.tiers && Array.isArray(pricingData.tiers)) {
            const allPackages: PackageOption[] = [];
            pricingData.tiers.forEach((tier: any) => {
              if (tier.packages && Array.isArray(tier.packages)) {
                tier.packages.forEach((pkg: any) => {
                  allPackages.push({
                    id: pkg.id || `${tier.id}-${pkg.packageType}`,
                    title: pkg.title || pkg.packageType,
                    priceInCents: pkg.priceInCents || 0,
                    packageType: pkg.packageType,
                    packageCategory: pkg.packageCategory || 'pass',
                    lessonCount: pkg.lessonCount || 1,
                    expirationDays: pkg.expirationDays || 365
                  });
                });
              }
            });
            setPackages(allPackages);
          }
        }
      } catch (error) {
        console.error('Error loading passes data:', error);
        setMessage({ type: 'error', text: 'Failed to load data' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  useEffect(() => {
    if (!selectedClient) {
      setClientPackages([]);
      return;
    }

    async function loadClientPackages() {
      if (!selectedClient || !orgId) return; // Type guard
      
      try {
        // Try new organization path first
        let packagesSnap = await getDocs(
          collection(db, 'organizations', orgId!, 'users', selectedClient.userId, 'packages')
        );
        
        // Fall back to old path if no packages found
        if (packagesSnap.empty) {
          packagesSnap = await getDocs(
            collection(db, 'users', selectedClient.userId, 'lessonPackages')
          );
        }
        
        const packagesData = packagesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            remainingLessons: (data.totalLessons || 0) - (data.lessonsUsed || 0)
          } as LessonPackage;
        });
        setClientPackages(packagesData);
      } catch (error) {
        console.error('Error loading client packages:', error);
      }
    }

    loadClientPackages();
  }, [selectedClient, orgId]);

  const handleSubmit = async () => {
    if (!selectedClient || !selectedPackage || !orgId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      if (action === 'add') {
        // Add passes to client
        const now = new Date();
        const expirationDate = new Date(now);
        // Use expirationDays from package, default to 365 if not set
        const daysToExpire = selectedPackage.expirationDays || 365;
        expirationDate.setDate(expirationDate.getDate() + daysToExpire);

        const passData = {
          packageType: selectedPackage.packageType,
          packageCategory: selectedPackage.packageCategory,
          packageName: selectedPackage.title,
          totalLessons: quantity,
          lessonsUsed: 0,
          purchaseDate: Timestamp.fromDate(now),
          expirationDate: Timestamp.fromDate(expirationDate),
          transactionId: `ADMIN_ADDED_${Date.now()}`,
          orgId: orgId
        };

        // Write to new organization path
        await addDoc(
          collection(db, 'organizations', orgId!, 'users', selectedClient.userId, 'packages'),
          passData
        );

        // Log activity
        if (orgId && user && userData) {
          await logPassIssued({
            orgId: orgId,
            actorId: user.uid,
            actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
            actorRole: 'admin',
            clientId: selectedClient.userId,
            clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
            passType: selectedPackage.packageType,
            passTitle: selectedPackage.title,
            quantity: quantity,
            totalSessions: quantity,
          });
        }

        setMessage({
          type: 'success',
          text: `Successfully added ${quantity} ${selectedPackage.title}${quantity === 1 ? '' : 's'} to ${selectedClient.firstName} ${selectedClient.lastName}'s account.`
        });
      } else {
        // Remove passes from client - try new path first
        let packagesQuery = query(
          collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages'),
          where('packageType', '==', selectedPackage.packageType)
        );
        let packagesSnap = await getDocs(packagesQuery);

        // Fallback to old path if empty
        const usingNewPath = !packagesSnap.empty;
        if (packagesSnap.empty) {
          packagesQuery = query(
            collection(db, 'users', selectedClient.userId, 'lessonPackages'),
            where('packageType', '==', selectedPackage.packageType)
          );
          packagesSnap = await getDocs(packagesQuery);
        }

        if (packagesSnap.empty) {
          setMessage({
            type: 'error',
            text: 'No passes of this type found for client'
          });
          setSubmitting(false);
          return;
        }

        // Sort by expiration date (remove from closest to expiring first)
        const sortedPackages = packagesSnap.docs.sort((a, b) => {
          const expA = a.data().expirationDate?.toDate?.() || new Date(8640000000000000);
          const expB = b.data().expirationDate?.toDate?.() || new Date(8640000000000000);
          return expA.getTime() - expB.getTime();
        });

        let remainingToRemove = quantity;

        for (const packageDoc of sortedPackages) {
          if (remainingToRemove <= 0) break;

          const packageData = packageDoc.data();
          const totalLessons = packageData.totalLessons || 0;
          const lessonsUsed = packageData.lessonsUsed || 0;
          const remaining = totalLessons - lessonsUsed;

          if (remaining <= 0) continue;

          // Use the correct path based on where we found the packages
          const docRef = usingNewPath
            ? doc(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages', packageDoc.id)
            : doc(db, 'users', selectedClient.userId, 'lessonPackages', packageDoc.id);

          if (remaining <= remainingToRemove) {
            // Remove entire package
            await deleteDoc(docRef);
            remainingToRemove -= remaining;
          } else {
            // Reduce totalLessons
            await updateDoc(
              docRef,
              { totalLessons: lessonsUsed + (remaining - remainingToRemove) }
            );
            remainingToRemove = 0;
          }
        }

        setMessage({
          type: 'success',
          text: `Successfully removed ${quantity} ${selectedPackage.title}${quantity === 1 ? '' : 's'} from ${selectedClient.firstName} ${selectedClient.lastName}'s account.`
        });
      }

      // Reset form
      setSelectedClient(null);
      setSelectedPackage(null);
      setQuantity(1);
      
      // Reload client packages if we had a client selected
      if (selectedClient) {
        // Try new path first
        let packagesSnap = await getDocs(
          collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages')
        );
        
        // Fallback to old path if empty
        if (packagesSnap.empty) {
          packagesSnap = await getDocs(
            collection(db, 'users', selectedClient.userId, 'lessonPackages')
          );
        }
        
        const packagesData = packagesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            remainingLessons: (data.totalLessons || 0) - (data.lessonsUsed || 0)
          } as LessonPackage;
        });
        setClientPackages(packagesData);
      }
    } catch (error) {
      console.error('Error managing passes:', error);
      setMessage({
        type: 'error',
        text: `Failed to ${action} passes: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <BusinessSettingsSubmenu>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-foreground/80">Loading passes...</p>
          </div>
          </div>
        </div>
      </BusinessSettingsSubmenu>
    );
  }

  return (
    <BusinessSettingsSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Passes</h1>
          <p className="text-foreground/80 mt-1">
            {action === 'add' ? 'Add lesson passes to client accounts' : 'Remove lesson passes from client accounts'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Client</label>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.id === e.target.value);
                  setSelectedClient(client || null);
                }}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">Choose a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Pass Type Selection - Grouped by Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pass Type</label>
              {packages.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">No packages available. Please configure pricing first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupPackagesByCategory(packages).map(group => (
                    <div key={group.category} className="border border-border rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <div className="bg-muted px-4 py-2 border-b border-border">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {group.displayName}
                        </h3>
                      </div>
                      
                      {/* Package Options within Category */}
                      <div className="divide-y divide-border">
                        {group.packages.map(pkg => {
                          const isSelected = selectedPackage?.id === pkg.id;
                          const perPassPrice = pkg.priceInCents / (pkg.lessonCount || 1) / 100;
                          
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => setSelectedPackage(pkg)}
                              className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                                isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{pkg.title}</span>
                                    {(pkg.lessonCount || 1) > 1 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                        {pkg.lessonCount} passes
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-semibold text-green-600">
                                      ${(pkg.priceInCents / 100).toFixed(2)}
                                    </span>
                                    {(pkg.lessonCount || 1) > 1 && (
                                      <span className="text-xs text-muted-foreground">
                                        (${perPassPrice.toFixed(2)} per pass)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected 
                                      ? 'border-primary bg-primary' 
                                      : 'border-muted-foreground'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Action Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Action</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAction('add')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'add'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-foreground hover:bg-gray-200'
                  }`}
                >
                  Add Passes
                </button>
                <button
                  onClick={() => setAction('remove')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'remove'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-foreground hover:bg-gray-200'
                  }`}
                >
                  Remove Passes
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Number of Passes</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold text-primary">{quantity}</span>
                  <span className="text-foreground/80 ml-2">pass{quantity === 1 ? '' : 'es'}</span>
                </div>
                <button
                  onClick={() => setQuantity(Math.min(100, quantity + 1))}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  disabled={quantity >= 100}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedClient || !selectedPackage || submitting}
              className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {action === 'add' ? 'Adding Pass...' : 'Removing Pass...'}
                </>
              ) : (
                <>
                  {action === 'add' ? <Plus className="mr-2 h-5 w-5" /> : <Minus className="mr-2 h-5 w-5" />}
                  {action === 'add' ? 'Add Pass to Client' : 'Remove Pass from Client'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Client Packages Display */}
        {selectedClient && clientPackages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedClient.firstName} {selectedClient.lastName}'s Passes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientPackages.map(pkg => (
                  <div key={pkg.id} className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">{pkg.packageName || pkg.packageType}</h4>
                      <p className="text-sm text-foreground/80">
                        {pkg.remainingLessons || 0} of {pkg.totalLessons} remaining
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {pkg.expirationDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {pkg.remainingLessons || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">passes left</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </BusinessSettingsSubmenu>
  );
}
