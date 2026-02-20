'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Minus, Package, User, Search, Calendar, Clock, Mail, Phone, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { logPassIssued } from '@/lib/activity-logger';

interface Client {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

interface PackageOption {
  id: string;
  title: string;
  priceInCents: number;
  packageType: string;
  packageCategory: 'oneAthlete' | 'twoAthlete' | 'threeAthlete' | 'fourAthlete' | 'classPass';
  lessonCount?: number;
  expirationDays: number;
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

export default function PassesPage() {
  const { orgId, user, userData } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientPackages, setClientPackages] = useState<LessonPackage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(1);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    async function loadData() {
      try {
        if (!orgId) return;
        
        // Load clients from orgMembers
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
                  email: userData.email || '',
                  phoneNumber: userData.phoneNumber || ''
                });
              }
            } catch (err) {
              console.warn('Could not load user data for', userId, err);
            }
          }
        }
        
        setClients(clientsData.sort((a, b) => a.lastName.localeCompare(b.lastName)));

        // Load pricing structure from organization
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
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgId]);

  // Load selected client's packages
  useEffect(() => {
    if (!selectedClient) {
      setClientPackages([]);
      return;
    }

    async function loadClientPackages() {
      if (!selectedClient || !orgId) return;
      
      try {
        // Try new organization path first
        let packagesSnap = await getDocs(
          collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages')
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
      // Debug: Check if orgMember document exists
      if (user?.uid && orgId) {
        const orgMemberDocId = `${user.uid}_${orgId}`;
        console.log('🔍 Checking orgMember document:', orgMemberDocId);
        try {
          const orgMemberDoc = await getDoc(doc(db, 'orgMembers', orgMemberDocId));
          if (orgMemberDoc.exists()) {
            console.log('✅ OrgMember document exists:', orgMemberDoc.data());
          } else {
            console.error('❌ OrgMember document does NOT exist:', orgMemberDocId);
            console.error('This is likely why you have permission-denied errors');
            setMessage({
              type: 'error',
              text: 'Your account is not properly linked to this organization. Please contact support.'
            });
            setConfirmDialogOpen(false);
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.error('Error checking orgMember document:', err);
        }
      }
      if (action === 'add') {
        // Add passes to client
        const now = new Date();
        const expirationDate = new Date(now);
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

        console.log('📝 Writing pass data:', passData);
        console.log('👤 Client userId:', selectedClient.userId);
        console.log('🏢 Organization ID:', orgId);

        // Write to BOTH paths for compatibility (like iOS admin app does):
        try {
          // 1. Old path (backward compatibility)
          console.log('📂 Writing to OLD path: users/' + selectedClient.userId + '/lessonPackages');
          const oldDocRef = await addDoc(
            collection(db, 'users', selectedClient.userId, 'lessonPackages'),
            passData
          );
          console.log('✅ OLD path write successful! Doc ID:', oldDocRef.id);
        } catch (oldPathError) {
          console.error('❌ OLD path write FAILED:', oldPathError);
          throw new Error(`Failed to write to legacy path: ${oldPathError instanceof Error ? oldPathError.message : String(oldPathError)}`);
        }

        try {
          // 2. New path (where modern client apps read)
          console.log('📂 Writing to NEW path: organizations/' + orgId + '/users/' + selectedClient.userId + '/packages');
          const newDocRef = await addDoc(
            collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages'),
            passData
          );
          console.log('✅ NEW path write successful! Doc ID:', newDocRef.id);
        } catch (newPathError) {
          console.error('❌ NEW path write FAILED:', newPathError);
          throw new Error(`Failed to write to new path: ${newPathError instanceof Error ? newPathError.message : String(newPathError)}`);
        }

        console.log('🎉 Both writes completed successfully!');

        // Try to log activity (but don't fail if it doesn't work - activities are write-protected)
        if (orgId && user && userData) {
          try {
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
          } catch (activityError) {
            console.warn('Could not log activity (activities collection is Cloud Function only):', activityError);
            // Don't fail the operation if activity logging fails
          }
        }

        setMessage({
          type: 'success',
          text: `Successfully added ${quantity} ${selectedPackage.title}${quantity === 1 ? '' : 's'} to ${selectedClient.firstName} ${selectedClient.lastName}'s account.`
        });

        // Refresh client packages
        const packagesSnap = await getDocs(
          collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages')
        );
        const packagesData = packagesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            remainingLessons: (data.totalLessons || 0) - (data.lessonsUsed || 0)
          } as LessonPackage;
        });
        setClientPackages(packagesData);
      } else {
        // Remove passes from client
        let packagesQuery = query(
          collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages'),
          where('packageType', '==', selectedPackage.packageType)
        );
        let packagesSnap = await getDocs(packagesQuery);

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

        // Sort by expiration date
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

          const docRef = usingNewPath
            ? doc(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages', packageDoc.id)
            : doc(db, 'users', selectedClient.userId, 'lessonPackages', packageDoc.id);

          if (remaining <= remainingToRemove) {
            await deleteDoc(docRef);
            remainingToRemove -= remaining;
          } else {
            await updateDoc(docRef, { totalLessons: lessonsUsed + (remaining - remainingToRemove) });
            remainingToRemove = 0;
          }
        }

        setMessage({
          type: 'success',
          text: `Successfully removed ${quantity} ${selectedPackage.title}${quantity === 1 ? '' : 's'} from ${selectedClient.firstName} ${selectedClient.lastName}'s account.`
        });

        // Refresh client packages
        let updatedPackagesSnap = await getDocs(
          collection(db, 'organizations', orgId, 'users', selectedClient.userId, 'packages')
        );
        if (updatedPackagesSnap.empty) {
          updatedPackagesSnap = await getDocs(
            collection(db, 'users', selectedClient.userId, 'lessonPackages')
          );
        }
        const packagesData = updatedPackagesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            remainingLessons: (data.totalLessons || 0) - (data.lessonsUsed || 0)
          } as LessonPackage;
        });
        setClientPackages(packagesData);
      }

      // Reset form
      setSelectedPackage(null);
      setQuantity(1);
      setConfirmDialogOpen(false);
    } catch (error: any) {
      console.error('Error managing passes:', error);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.message);
      console.error('Current user:', user?.uid);
      console.error('User role:', userData?.role);
      console.error('OrgId:', orgId);
      
      let errorMessage = 'Unknown error';
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please ensure you have admin/trainer access to this organization.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({
        type: 'error',
        text: `Failed to ${action} passes: ${errorMessage}`
      });
      setConfirmDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setSheetOpen(true);
    setMessage(null);
    setSelectedPackage(null);
    setAction('add');
    setQuantity(1);
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    return (
      client.firstName.toLowerCase().includes(searchLower) ||
      client.lastName.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower)
    );
  });

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
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Passes</h1>
            <p className="text-foreground/80 mt-1">
              Add or remove lesson passes for clients
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          {/* Clients Grid */}
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchQuery ? 'No clients found' : 'No clients yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search query' : 'Add clients to manage their passes'}
                  </p>
                </div>
          </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => handleClientClick(client)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text truncate">
                            {client.firstName} {client.lastName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </p>
                          {client.phoneNumber && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {client.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Pass Management Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Success/Error Message */}
                {message && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{message.text}</p>
                  </div>
                )}

                {/* Current Passes */}
                {clientPackages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Current Passes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {clientPackages.map(pkg => {
                          const isExpired = pkg.expirationDate?.toDate?.() < new Date();
                          return (
                            <div
                              key={pkg.id}
                              className={`p-4 rounded-lg border ${isExpired ? 'bg-muted/30 border-muted' : 'bg-background border-border'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-foreground flex items-center gap-2">
                                    {pkg.packageName || pkg.packageType}
                                    {isExpired && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                        Expired
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {pkg.remainingLessons || 0} of {pkg.totalLessons} remaining
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Expires: {pkg.expirationDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <div className={`text-3xl font-bold ${isExpired ? 'text-muted-foreground' : 'text-primary'}`}>
                                    {pkg.remainingLessons || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">passes left</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add/Remove Toggle */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={action === 'add' ? 'default' : 'outline'}
                      onClick={() => setAction('add')}
                      className="h-12"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Passes
                    </Button>
                    <Button
                      type="button"
                      variant={action === 'remove' ? 'default' : 'outline'}
                      onClick={() => setAction('remove')}
                      className="h-12"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Remove Passes
                    </Button>
                  </div>
                </div>

                {/* Pass Type Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Select Pass Type</label>
                  {packages.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700">No packages available. Please configure pricing first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupPackagesByCategory(packages).map(group => (
                        <div key={group.category} className="border border-border rounded-lg overflow-hidden">
                          {/* Category Header */}
                          <div className="bg-muted px-4 py-2 border-b border-border">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {group.displayName}
                            </h3>
                          </div>
                          
                          {/* Package Options */}
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

                {/* Quantity Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Number of Passes</label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-12 w-12"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-3xl font-bold text-primary">{quantity}</span>
                      <span className="text-foreground/80 ml-2">pass{quantity === 1 ? '' : 'es'}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min(100, quantity + 1))}
                      disabled={quantity >= 100}
                      className="h-12 w-12"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={!selectedPackage || submitting}
                  className="w-full h-14 text-lg"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {action === 'add' ? 'Adding...' : 'Removing...'}
                    </>
                  ) : (
                    <>
                      {action === 'add' ? <Plus className="mr-2 h-5 w-5" /> : <Minus className="mr-2 h-5 w-5" />}
                      {action === 'add' ? 'Add Passes to Client' : 'Remove Passes from Client'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm {action === 'add' ? 'Add' : 'Remove'} Passes
            </DialogTitle>
            <DialogDescription>
              {selectedClient && selectedPackage && (
                <div className="space-y-3 pt-2">
                  <p className="text-base">
                    Are you sure you want to <span className="font-semibold">{action}</span>{' '}
                    <span className="font-semibold text-primary">{quantity}</span>{' '}
                    {selectedPackage.title}{quantity === 1 ? '' : 's'}{' '}
                    {action === 'add' ? 'to' : 'from'}{' '}
                    <span className="font-semibold">{selectedClient.firstName} {selectedClient.lastName}</span>?
                  </p>
                  
                  {action === 'add' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          This will add {quantity} pass{quantity === 1 ? '' : 'es'} to the client's account at no charge. 
                          The client will not be billed for this.
                        </span>
                      </p>
                    </div>
                  )}
                  
                  {action === 'remove' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <p className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          This will remove {quantity} pass{quantity === 1 ? '' : 'es'} from the client's account, 
                          starting with the passes closest to expiring.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={action === 'add' ? 'bg-primary' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {action === 'add' ? 'Adding...' : 'Removing...'}
                </>
              ) : (
                <>
                  {action === 'add' ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                  Confirm {action === 'add' ? 'Add' : 'Remove'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessSettingsSubmenu>
  );
}
