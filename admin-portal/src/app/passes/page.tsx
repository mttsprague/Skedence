'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Minus, Package, User } from 'lucide-react';

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
  packageCategory: 'pass' | 'class';
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
  const { orgId } = useAuth();
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
                    packageCategory: pkg.packageCategory || 'pass'
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
      if (!selectedClient) return; // Type guard
      
      try {
        const packagesQuery = query(
          collection(db, 'users', selectedClient.userId, 'lessonPackages')
        );
        const packagesSnap = await getDocs(packagesQuery);
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
  }, [selectedClient]);

  const handleSubmit = async () => {
    if (!selectedClient || !selectedPackage || !orgId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      if (action === 'add') {
        // Add passes to client
        const now = new Date();
        const expirationDate = new Date(now);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

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

        await addDoc(
          collection(db, 'users', selectedClient.userId, 'lessonPackages'),
          passData
        );

        setMessage({
          type: 'success',
          text: `Successfully added ${quantity} ${selectedPackage.title}${quantity === 1 ? '' : 's'} to ${selectedClient.firstName} ${selectedClient.lastName}'s account.`
        });
      } else {
        // Remove passes from client
        const packagesQuery = query(
          collection(db, 'users', selectedClient.userId, 'lessonPackages'),
          where('packageType', '==', selectedPackage.packageType)
        );
        const packagesSnap = await getDocs(packagesQuery);

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

          if (remaining <= remainingToRemove) {
            // Remove entire package
            await deleteDoc(doc(db, 'users', selectedClient.userId, 'lessonPackages', packageDoc.id));
            remainingToRemove -= remaining;
          } else {
            // Reduce totalLessons
            await updateDoc(
              doc(db, 'users', selectedClient.userId, 'lessonPackages', packageDoc.id),
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
        const packagesQuery = query(
          collection(db, 'users', selectedClient.userId, 'lessonPackages')
        );
        const packagesSnap = await getDocs(packagesQuery);
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading passes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Passes</h1>
          <p className="text-gray-600 mt-1">
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
              <label className="text-sm font-medium text-gray-700">Select Client</label>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.id === e.target.value);
                  setSelectedClient(client || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
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

            {/* Pass Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Pass Type</label>
              <select
                value={selectedPackage?.id || ''}
                onChange={(e) => {
                  const pkg = packages.find(p => p.id === e.target.value);
                  setSelectedPackage(pkg || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                disabled={packages.length === 0}
              >
                <option value="">Select a pass type</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.title} - ${(pkg.priceInCents / 100).toFixed(2)} ({pkg.packageCategory === 'pass' ? 'Pass' : 'Class'})
                  </option>
                ))}
              </select>
              {packages.length === 0 && (
                <p className="text-sm text-amber-600">No packages available. Please configure pricing first.</p>
              )}
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Action Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Action</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAction('add')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'add'
                      ? 'bg-[#3258A3] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Add Passes
                </button>
                <button
                  onClick={() => setAction('remove')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'remove'
                      ? 'bg-[#3258A3] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Remove Passes
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Number of Passes</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold text-[#3258A3]">{quantity}</span>
                  <span className="text-gray-600 ml-2">pass{quantity === 1 ? '' : 'es'}</span>
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
              className="w-full bg-[#3258A3] hover:bg-[#2a4a8a] text-white py-6 text-lg"
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
                  <div key={pkg.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{pkg.packageName || pkg.packageType}</h4>
                      <p className="text-sm text-gray-600">
                        {pkg.remainingLessons || 0} of {pkg.totalLessons} remaining
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires: {pkg.expirationDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#3258A3]">
                        {pkg.remainingLessons || 0}
                      </div>
                      <div className="text-xs text-gray-500">passes left</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
