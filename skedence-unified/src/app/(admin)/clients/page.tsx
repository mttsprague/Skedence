'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ClientCardSkeleton } from '@/components/ui/skeleton';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, AthleteInfo } from '@/types';
import { Save, X, User as UserIcon, Search, Calendar, Package, FileText, CreditCard, Receipt, History, Download, Smartphone, QrCode, Key } from 'lucide-react';
import { logClientProfileUpdated } from '@/lib/activity-logger';
import { trackPageView } from '@/lib/analytics';
import { toast } from '@/lib/toast';

interface Booking {
  id: string;
  trainerId: string;
  trainerName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: string;
  athleteNames?: string[];
  lessonPackageId?: string;
  orgId: string;
}

interface LessonPackage {
  id: string;
  packageType: string;
  packageName: string;
  packageCategory: string;
  totalLessons: number;
  lessonsUsed: number;
  remainingLessons: number;
  purchaseDate: Timestamp;
  expirationDate: Timestamp;
  amountPaid?: number;
  transactionId?: string;
}

interface Document {
  id: string;
  name: string;
  displayName?: string;
  type: string;
  url: string;
  uploadedAt: Timestamp;
  uploadedBy?: string;
  signedBy?: string;
  signatoryEmail?: string;
  isMinor?: boolean;
  athleteName?: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
}

interface PricingPackage {
  id: string;
  title: string;
  isActive: boolean;
}

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description?: string;
  createdAt: Timestamp;
  status: string;
  stripePaymentIntentId?: string;
  paymentIntentId?: string;
  packageId?: string;
  packageName?: string;
  orgId?: string;
  type?: string;
}

type TabType = 'profile' | 'upcoming' | 'history' | 'passes' | 'documents' | 'payments' | 'receipts';

export default function ClientsPage() {
  const { orgId, user, userData } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editedClient, setEditedClient] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [tabDataLoading, setTabDataLoading] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [receipts, setReceipts] = useState<Transaction[]>([]);
  const [pricingPackages, setPricingPackages] = useState<PricingPackage[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  
  // Advanced Filters
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('all');
  const [passStatusFilter, setPassStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name'); // 'name', 'joined', 'balance'

  // Track page view
  useEffect(() => {
    trackPageView('/clients', 'Clients');
  }, []);

  // Keyboard shortcuts event listeners
  useEffect(() => {
    const handleNewClient = () => {
      setSelectedClient(null);
      setEditedClient(null);
      setActiveTab('profile');
      setSheetOpen(true);
    };

    const handleExport = () => {
      // Export clients to CSV
      const csvHeaders = ['First Name', 'Last Name', 'Email', 'Phone Number', 'Join Date', 'Total Passes', 'Active Passes'];
      const csvRows = filteredClients.map(client => {
        let joinDate = '';
        if (client.createdAt) {
          try {
            // Try Firestore Timestamp
            joinDate = new Date((client.createdAt as any).toMillis()).toLocaleDateString();
          } catch {
            // Fall back to Date
            if (client.createdAt instanceof Date) {
              joinDate = client.createdAt.toLocaleDateString();
            }
          }
        }
        
        return [
          client.firstName || '',
          client.lastName || '',
          client.email || client.emailAddress || '',
          client.phoneNumber || '',
          joinDate,
          '0', // TODO: Load actual package counts
          '0'
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Clients exported to CSV');
    };

    window.addEventListener('trigger-new-client', handleNewClient);
    window.addEventListener('trigger-export', handleExport);

    return () => {
      window.removeEventListener('trigger-new-client', handleNewClient);
      window.removeEventListener('trigger-export', handleExport);
    };
  }, [clients, searchQuery]); // Changed from filteredClients to dependencies

  // Load organization data including invite code
  useEffect(() => {
    if (!orgId) return;

    async function loadOrganizationData() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          setInviteCode(orgData.inviteCode || '');
        }
      } catch (error) {
        console.error('Error loading organization data:', error);
      }
    }

    loadOrganizationData();
  }, [orgId]);

  // Load clients
  useEffect(() => {
    if (!orgId) return;

    async function loadClients() {
      try {
        const membersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        const clientPromises = membersSnapshot.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data();
          if (memberData.role !== 'client') return null;
          
          const userDoc = await getDoc(doc(db, 'users', memberData.userId));
          if (!userDoc.exists()) return null;
          
          const userData = userDoc.data();
          
          // Convert legacy athlete fields to athletes array if needed
          let athletesArray: AthleteInfo[] = [];
          if (Array.isArray(userData.athletes) && userData.athletes.length > 0) {
            athletesArray = userData.athletes;
          } else {
            // Build athletes array from legacy fields
            if (userData.athleteFirstName || userData.athleteLastName) {
              athletesArray.push({
                firstName: userData.athleteFirstName,
                lastName: userData.athleteLastName,
                birthday: userData.athleteBirthday,
                position: userData.athletePosition,
              });
            }
            if (userData.athlete2FirstName || userData.athlete2LastName) {
              athletesArray.push({
                firstName: userData.athlete2FirstName,
                lastName: userData.athlete2LastName,
                birthday: userData.athlete2Birthday,
                position: userData.athlete2Position,
              });
            }
            if (userData.athlete3FirstName || userData.athlete3LastName) {
              athletesArray.push({
                firstName: userData.athlete3FirstName,
                lastName: userData.athlete3LastName,
                birthday: userData.athlete3Birthday,
                position: userData.athlete3Position,
              });
            }
          }
          
          return {
            id: memberData.userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.emailAddress || userData.email || '',
            emailAddress: userData.emailAddress || userData.email || '',
            phone: userData.phoneNumber || '',
            phoneNumber: userData.phoneNumber || '',
            role: memberData.role,
            createdAt: memberData.joinedAt,
            isActive: userData.isActive !== false,
            athletes: athletesArray,
            athleteFirstName: userData.athleteFirstName,
            athleteLastName: userData.athleteLastName,
            athleteBirthday: userData.athleteBirthday,
            athletePosition: userData.athletePosition,
            athlete2FirstName: userData.athlete2FirstName,
            athlete2LastName: userData.athlete2LastName,
            athlete2Birthday: userData.athlete2Birthday,
            athlete2Position: userData.athlete2Position,
            athlete3FirstName: userData.athlete3FirstName,
            athlete3LastName: userData.athlete3LastName,
            athlete3Birthday: userData.athlete3Birthday,
            athlete3Position: userData.athlete3Position,
            emergencyContactName: userData.emergencyContactName,
            emergencyContactNumber: userData.emergencyContactNumber,
            referredBy: userData.referredBy,
            notesForCoach: userData.notesForCoach,
          } as User;
        });
        
        const clientsData = (await Promise.all(clientPromises))
          .filter((c): c is User => c !== null)
          .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        setClients(clientsData);
      } catch (error) {
        console.error('Clients: Error loading:', error);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, [orgId]);

  // Load tab data when client is selected
  useEffect(() => {
    if (!orgId || !selectedClient) return;

    async function loadTabData() {
      setTabDataLoading(true);
      try {
        if (!orgId || !selectedClient) return; // Type guard

        // Load bookings
        const now = new Date();
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientUID', '==', selectedClient.id),
          where('orgId', '==', orgId)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];

        setUpcomingBookings(
          bookingsData
            .filter(b => b.startTime.toDate() >= now)
            .sort((a, b) => a.startTime.seconds - b.startTime.seconds)
        );

        setPastBookings(
          bookingsData
            .filter(b => b.startTime.toDate() < now)
            .sort((a, b) => b.startTime.seconds - a.startTime.seconds)
        );

        // Load packages - try new path first
        let packagesSnap = await getDocs(
          collection(db, 'organizations', orgId, 'users', selectedClient.id, 'packages')
        );

        // Fallback to old path
        if (packagesSnap.empty) {
          packagesSnap = await getDocs(
            collection(db, 'users', selectedClient.id, 'lessonPackages')
          );
        }

        const packagesData = packagesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            remainingLessons: (data.totalLessons || 0) - (data.lessonsUsed || 0),
          };
        }) as LessonPackage[];
        setPackages(packagesData);

        // Load documents from /documents subcollection (standard path)
        console.log('🔍 Querying documents for user:', selectedClient.id);
        const docsSnap = await getDocs(
          collection(db, 'users', selectedClient.id, 'documents')
        );
        console.log('📁 Found documents in /documents:', docsSnap.docs.length);
        
        const docsData = docsSnap.docs.map(doc => {
          const data = doc.data();
          console.log('Document data:', {
            id: doc.id,
            type: data.type,
            name: data.name || data.displayName,
            uploadedAt: data.uploadedAt
          });
          return {
            id: doc.id,
            ...data,
          };
        }) as Document[];
        
        // ALSO check legacy /waivers subcollection (just in case)
        console.log('🔍 Checking legacy waivers subcollection...');
        const waiversSnap = await getDocs(
          collection(db, 'users', selectedClient.id, 'waivers')
        );
        console.log('📁 Found waivers in /waivers:', waiversSnap.docs.length);
        
        const waiversData = waiversSnap.docs.map(doc => {
          const data = doc.data();
          console.log('Legacy waiver data:', {
            id: doc.id,
            ...data
          });
          return {
            id: doc.id,
            type: 'waiver', // Ensure it's marked as waiver
            ...data,
          };
        }) as Document[];
        
        // Merge both sources
        const allDocs = [...docsData, ...waiversData];
        console.log('📊 Total documents found:', allDocs.length);
        
        // Sort by uploadedAt (newest first)
        const sortedDocs = allDocs.sort((a, b) => 
          b.uploadedAt?.seconds - a.uploadedAt?.seconds
        );
        setDocuments(sortedDocs);

        // Load pricing packages to check if they're active
        const pricingSnap = await getDocs(
          collection(db, 'organizations', orgId, 'pricingPackages')
        );
        const pricingData = pricingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PricingPackage[];
        setPricingPackages(pricingData);

        // Load payment methods
        const paymentsSnap = await getDocs(
          collection(db, 'users', selectedClient.id, 'paymentMethods')
        );
        const paymentsData = paymentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PaymentMethod[];
        console.log('Payment methods loaded:', paymentsData.length, paymentsData);
        setPaymentMethods(paymentsData);

        // Load receipts/transactions
        const receiptsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', selectedClient.id),
          where('orgId', '==', orgId)
        );
        const receiptsSnap = await getDocs(receiptsQuery);
        const receiptsData = receiptsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        console.log('Loaded receipts:', receiptsData.length, receiptsData);
        const sortedReceipts = receiptsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        setReceipts(sortedReceipts);

        console.log('Payment methods loaded:', paymentsData.length, paymentsData);

      } catch (error) {
        console.error('Error loading tab data:', error);
      } finally {
        setTabDataLoading(false);
      }
    }

    loadTabData();
  }, [orgId, selectedClient]);

  const filteredClients = clients.filter(client => {
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
      const email = (client.email || client.emailAddress || '').toLowerCase();
      if (!fullName.includes(search) && !email.includes(search)) {
        return false;
      }
    }
    
    // Package type filter (requires loading packages - for now simplified)
    // Full implementation would require loading all client packages
    
    return true;
  }).sort((a, b) => {
    // Sort logic
    switch (sortBy) {
      case 'name':
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      case 'joined':
        // Handle both Firestore Timestamp and Date
        const dateA = a.createdAt 
          ? (typeof (a.createdAt as any).toMillis === 'function' 
            ? (a.createdAt as any).toMillis() 
            : a.createdAt instanceof Date 
              ? a.createdAt.getTime() 
              : 0)
          : 0;
        const dateB = b.createdAt 
          ? (typeof (b.createdAt as any).toMillis === 'function' 
            ? (b.createdAt as any).toMillis() 
            : b.createdAt instanceof Date 
              ? b.createdAt.getTime() 
              : 0)
          : 0;
        return dateB - dateA; // Most recent first
      default:
        return 0;
    }
  });

  const handleClientSelect = (client: User) => {
    setSelectedClient(client);
    setEditedClient(JSON.parse(JSON.stringify(client)));
    setActiveTab('profile');
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!editedClient || !editedClient.id) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, 'users', editedClient.id);
      
      const updateData: any = {
        firstName: editedClient.firstName || '',
        lastName: editedClient.lastName || '',
        emailAddress: editedClient.emailAddress || editedClient.email || '',
        phoneNumber: editedClient.phoneNumber || editedClient.phone || '',
        emergencyContactName: editedClient.emergencyContactName || '',
        emergencyContactNumber: editedClient.emergencyContactNumber || '',
        referredBy: editedClient.referredBy || '',
        notesForCoach: editedClient.notesForCoach || '',
      };
      
      if (editedClient.athletes && editedClient.athletes.length > 0) {
        updateData.athletes = editedClient.athletes;
      }
      
      updateData.athleteFirstName = editedClient.athleteFirstName || '';
      updateData.athleteLastName = editedClient.athleteLastName || '';
      updateData.athleteBirthday = editedClient.athleteBirthday || '';
      updateData.athletePosition = editedClient.athletePosition || '';
      updateData.athlete2FirstName = editedClient.athlete2FirstName || '';
      updateData.athlete2LastName = editedClient.athlete2LastName || '';
      updateData.athlete2Birthday = editedClient.athlete2Birthday || '';
      updateData.athlete2Position = editedClient.athlete2Position || '';
      updateData.athlete3FirstName = editedClient.athlete3FirstName || '';
      updateData.athlete3LastName = editedClient.athlete3LastName || '';
      updateData.athlete3Birthday = editedClient.athlete3Birthday || '';
      updateData.athlete3Position = editedClient.athlete3Position || '';
      
      await updateDoc(userRef, updateData);
      
      // Log activity
      if (orgId && user && userData) {
        const updatedFields: string[] = [];
        if (updateData.firstName || updateData.lastName) updatedFields.push('name');
        if (updateData.emailAddress) updatedFields.push('email');
        if (updateData.phoneNumber) updatedFields.push('phone');
        if (updateData.emergencyContactName || updateData.emergencyContactNumber) updatedFields.push('emergency contact');
        if (updateData.athletes) updatedFields.push('athletes');
        if (updateData.referredBy) updatedFields.push('referral');
        if (updateData.notesForCoach) updatedFields.push('notes');
        
        await logClientProfileUpdated({
          orgId: orgId,
          actorId: user.uid,
          actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
          actorRole: 'admin',
          clientId: editedClient.id,
          clientName: `${editedClient.firstName} ${editedClient.lastName}`,
          fields: updatedFields,
        });
      }
      
      setClients(prev => prev.map(c => c.id === editedClient.id ? editedClient : c));
      setSelectedClient(editedClient);
      
      toast.success('Client profile updated successfully!');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client profile', 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedClient(selectedClient ? JSON.parse(JSON.stringify(selectedClient)) : null);
  };

  const updateEditedClient = (field: string, value: any) => {
    if (!editedClient) return;
    setEditedClient({ ...editedClient, [field]: value });
  };

  const updateAthlete = (index: number, field: string, value: string) => {
    if (!editedClient) return;
    const athletes = [...(editedClient.athletes || [])];
    if (!athletes[index]) {
      athletes[index] = {};
    }
    athletes[index] = { ...athletes[index], [field]: value };
    setEditedClient({ ...editedClient, athletes });
  };

  const addAthlete = () => {
    if (!editedClient) return;
    const athletes = [...(editedClient.athletes || []), {}];
    setEditedClient({ ...editedClient, athletes });
  };

  const removeAthlete = (index: number) => {
    if (!editedClient) return;
    const athletes = (editedClient.athletes || []).filter((_, i) => i !== index);
    setEditedClient({ ...editedClient, athletes });
  };

  if (loading) {
    return (
      <SchedulingSubmenu>
        <div className="p-6 lg:p-8">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
              <div className="h-9 w-32 bg-muted animate-pulse rounded" />
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            </div>
            
            {/* Search and filter skeleton */}
            <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
            
            {/* Client cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </SchedulingSubmenu>
    );
  }

  return (
    <SchedulingSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-sm sm:text-base text-foreground/80 mt-1 sm:mt-2">
            {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
            {filteredClients.length !== clients.length && ` (filtered from ${clients.length})`}
          </p>
        </div>

        {/* Client Invitation Instructions */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    How to Invite Clients
                  </h3>
                  <p className="text-sm text-foreground/80">
                    Your clients can download the Skedence app and connect to your business in three easy steps:
                  </p>
                </div>
                
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Download the Skedence app</p>
                      <p className="text-foreground/70 mt-0.5">Available on iOS and Android app stores</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Create their account</p>
                      <p className="text-foreground/70 mt-0.5">Sign up with their email address</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Enter your organization code</p>
                      <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-primary" />
                          <span className="text-xs text-foreground/70">Organization Code:</span>
                        </div>
                        <code className="block px-3 py-2 bg-primary/10 rounded text-primary font-mono font-bold text-lg">
                          {inviteCode || 'Loading...'}
                        </code>
                      </div>
                      <p className="text-foreground/70 mt-2">They enter this code during signup to connect to your business</p>
                    </div>
                  </li>
                </ol>

                <div className="pt-2 pb-1 flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Share this code via text, email, or QR code</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Clients can book 24/7 from their phone</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent touch-manipulation text-base"
              aria-label="Search clients"
            />
          </div>
          
          {/* Advanced Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              aria-label="Sort clients by"
            >
              <option value="name">Sort by Name</option>
              <option value="joined">Sort by Join Date</option>
            </select>
            
            {/* Filter badges showing active filters */}
            {(packageTypeFilter !== 'all' || passStatusFilter !== 'all') && (
              <button
                onClick={() => {
                  setPackageTypeFilter('all');
                  setPassStatusFilter('all');
                }}
                className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors"
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Client Cards Grid */}
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-foreground/80">
                {searchQuery ? `No clients found matching "${searchQuery}"` : 'No clients yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <div 
                key={client.id}
                className="cursor-pointer"
                onClick={() => handleClientSelect(client)}
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {(client.firstName?.[0] || '') + (client.lastName?.[0] || '')}
                      </span>
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-foreground/80 truncate">{client.email || client.emailAddress}</p>
                      {client.phone && (
                        <p className="text-sm text-muted-foreground truncate">{client.phone}</p>
                      )}
                      {(client.athletes && client.athletes.length > 0) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {client.athletes.length} {client.athletes.length === 1 ? 'athlete' : 'athletes'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Client Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          {selectedClient && (
            <div className="flex flex-col h-full">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white z-10 border-b">
                <SheetHeader className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xl">
                        {(selectedClient.firstName?.[0] || '') + (selectedClient.lastName?.[0] || '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-2xl font-bold text-foreground">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </SheetTitle>
                      <p className="text-sm text-foreground/80">{selectedClient.email || selectedClient.emailAddress}</p>
                      {selectedClient.phone && (
                        <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                      )}
                    </div>
                  </div>
                </SheetHeader>

                {/* Tabs */}
                <div className="border-t border-gray-200 px-2">
                  <nav className="flex gap-1 overflow-x-auto p-2">
                    {[
                      { id: 'profile' as TabType, label: 'Profile', icon: UserIcon },
                      { id: 'upcoming' as TabType, label: 'Upcoming', icon: Calendar, count: upcomingBookings.length },
                      { id: 'history' as TabType, label: 'History', icon: History, count: pastBookings.length },
                      { id: 'passes' as TabType, label: 'Passes', icon: Package, count: packages.filter(p => p.remainingLessons > 0).length },
                      { id: 'documents' as TabType, label: 'Documents', icon: FileText, count: documents.length },
                      { id: 'payments' as TabType, label: 'Payments', icon: CreditCard, count: paymentMethods.length },
                      { id: 'receipts' as TabType, label: 'Receipts', icon: Receipt, count: receipts.length },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ${
                            activeTab === tab.id
                              ? 'bg-primary text-white'
                              : 'text-foreground/80 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                          {tab.count !== undefined && (
                            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                              activeTab === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200 text-foreground'
                            }`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {tabDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'profile' && (
                      <div className="p-6 space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-primary">{upcomingBookings.length}</div>
                              <div className="text-sm text-foreground/80">Upcoming</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-green-600">{packages.filter(p => p.remainingLessons > 0).length}</div>
                              <div className="text-sm text-foreground/80">Active Passes</div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Contact Info */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-foreground/80">Email</p>
                                <p className="font-medium">{selectedClient.email || selectedClient.emailAddress}</p>
                              </div>
                              <div>
                                <p className="text-sm text-foreground/80">Phone</p>
                                <p className="font-medium">{selectedClient.phone || selectedClient.phoneNumber || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-foreground/80">Emergency Contact</p>
                                <p className="font-medium">{selectedClient.emergencyContactName || 'Not provided'}</p>
                                {selectedClient.emergencyContactNumber && (
                                  <p className="text-sm text-muted-foreground">{selectedClient.emergencyContactNumber}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-foreground/80">Referred By</p>
                                <p className="font-medium">{selectedClient.referredBy || 'Not provided'}</p>
                              </div>
                            </div>
                            {selectedClient.notesForCoach && (
                              <div>
                                <p className="text-sm text-foreground/80">Notes for Coach</p>
                                <p className="font-medium">{selectedClient.notesForCoach}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Athletes */}
                        {selectedClient.athletes && selectedClient.athletes.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Athletes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {selectedClient.athletes.map((athlete, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                  <p className="font-semibold">{athlete.firstName} {athlete.lastName}</p>
                                  {athlete.birthday && <p className="text-sm text-muted-foreground">DOB: {athlete.birthday}</p>}
                                  {athlete.position && <p className="text-sm text-muted-foreground">Position: {athlete.position}</p>}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {activeTab === 'upcoming' && (
                      <div className="p-6">
                        {upcomingBookings.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No upcoming sessions</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {upcomingBookings.map((booking) => (
                              <Card key={booking.id}>
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <p className="font-semibold">{booking.startTime.toDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                      <p className="text-sm text-foreground/80">
                                        {booking.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </p>
                                      <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                                      {booking.athleteNames && booking.athleteNames.length > 0 && (
                                        <p className="text-xs text-muted-foreground">Athletes: {booking.athleteNames.join(', ')}</p>
                                      )}
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      {booking.status}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="p-6">
                        {pastBookings.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No past sessions</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {pastBookings.map((booking) => (
                              <Card key={booking.id}>
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <p className="font-semibold">{booking.startTime.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                      <p className="text-sm text-foreground/80">
                                        {booking.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </p>
                                      <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      booking.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-foreground'
                                    }`}>
                                      {booking.status}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'passes' && (
                      <div className="p-6">
                        {packages.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No passes purchased</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {packages.filter(p => p.remainingLessons > 0).length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Active Passes</h3>
                                <div className="space-y-3">
                                  {packages.filter(p => p.remainingLessons > 0).map((pkg) => (
                                    <Card key={pkg.id}>
                                      <CardContent className="pt-6">
                                        <div className="flex items-start justify-between mb-2">
                                          <h4 className="font-semibold">{pkg.packageName || pkg.packageType}</h4>
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                                        </div>
                                        <p className="text-sm text-foreground/80">
                                          <span className="font-medium text-primary">{pkg.remainingLessons}</span> of {pkg.totalLessons} sessions remaining
                                        </p>
                                        <p className="text-sm text-foreground/80">Expires: {pkg.expirationDate.toDate().toLocaleDateString()}</p>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            {packages.filter(p => p.remainingLessons === 0).length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Used Passes</h3>
                                <div className="space-y-3">
                                  {packages.filter(p => p.remainingLessons === 0).map((pkg) => (
                                    <Card key={pkg.id} className="opacity-60">
                                      <CardContent className="pt-6">
                                        <h4 className="font-semibold mb-2">{pkg.packageName || pkg.packageType}</h4>
                                        <p className="text-sm text-foreground/80">{pkg.lessonsUsed} of {pkg.totalLessons} sessions used</p>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'documents' && (
                      <div className="p-6">
                        {documents.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No documents or waivers</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.map((doc) => {
                              const isWaiver = doc.type === 'waiver';
                              const displayName = doc.displayName || doc.name;
                              const athleteLabel = doc.athleteName ? ` - ${doc.athleteName}` : '';
                              return (
                                <Card key={doc.id}>
                                  <CardContent className="pt-6">
                                    <div className="flex items-start gap-3 mb-3">
                                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="font-medium truncate">{displayName}{athleteLabel}</p>
                                          {isWaiver && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex-shrink-0">Waiver</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {doc.uploadedAt.toDate().toLocaleDateString()}
                                        </p>
                                        {isWaiver && doc.signedBy && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Signed by: {doc.signedBy}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
                                      View PDF
                                    </a>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'payments' && (
                      <div className="p-6">
                        {paymentMethods.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No payment methods on file</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {paymentMethods.map((method) => (
                              <Card key={method.id}>
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <CreditCard className="h-6 w-6 text-gray-400" />
                                      <div>
                                        <p className="font-medium">{method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}</p>
                                        <p className="text-sm text-foreground/80">Expires {method.expMonth || method.expiryMonth}/{method.expYear || method.expiryYear}</p>
                                      </div>
                                    </div>
                                    {method.isDefault && (
                                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Default</span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'receipts' && (
                      <div className="p-6">
                        {receipts.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No receipts</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {receipts.map((receipt) => (
                              <Card key={receipt.id}>
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold">{receipt.description || receipt.packageName || 'Purchase'}</p>
                                      <p className="text-sm text-foreground/80 mt-1">
                                        {receipt.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-primary">${((receipt.amount || 0) / 100).toFixed(2)}</p>
                                      <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${
                                        receipt.status === 'succeeded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-foreground'
                                      }`}>
                                        {receipt.status}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SchedulingSubmenu>
  );
}
