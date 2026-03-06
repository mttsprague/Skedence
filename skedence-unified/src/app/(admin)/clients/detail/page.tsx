'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Calendar, Package, FileText, CreditCard, User as UserIcon, Receipt, History, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: any;
}

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
  isClassBooking?: boolean;
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
  type: string;
  url: string;
  uploadedAt: Timestamp;
  uploadedBy?: string;
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

interface PricingPackage {
  id: string;
  title: string;
  packageType: string;
  active: boolean;
}

type TabType = 'overview' | 'upcoming' | 'history' | 'passes' | 'documents' | 'payments' | 'receipts';

function ClientDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { orgId } = useAuth();
  const clientId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  
  // Computed values to separate lessons from classes
  const upcomingLessons = upcomingBookings.filter(b => !b.isClassBooking);
  const upcomingClasses = upcomingBookings.filter(b => b.isClassBooking);
  const pastLessons = pastBookings.filter(b => !b.isClassBooking);
  const pastClasses = pastBookings.filter(b => b.isClassBooking);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [receipts, setReceipts] = useState<Transaction[]>([]);
  const [pricingPackages, setPricingPackages] = useState<PricingPackage[]>([]);

  useEffect(() => {
    if (!orgId || !clientId) return;

    async function loadClientData() {
      try {
        if (!orgId || !clientId) return; // Type guard

        // Load client basic info
        const userDoc = await getDoc(doc(db, 'users', clientId));
        if (!userDoc.exists()) {
          router.push('/clients');
          return;
        }

        const userData = userDoc.data();
        setClient({
          id: clientId,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.emailAddress || userData.email || '',
          phone: userData.phoneNumber || '',
          createdAt: userData.createdAt,
        });

        // Load bookings
        const now = new Date();
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientUID', '==', clientId),
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
          collection(db, 'organizations', orgId, 'users', clientId, 'packages')
        );

        // Fallback to old path
        if (packagesSnap.empty) {
          packagesSnap = await getDocs(
            collection(db, 'users', clientId, 'lessonPackages')
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

        // Load documents
        const docsSnap = await getDocs(
          collection(db, 'users', clientId, 'documents')
        );
        const docsData = docsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Document[];
        setDocuments(docsData);

        // Load pricing packages to check if they're active
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          const pricingStructure = orgData.pricingStructure;
          if (pricingStructure?.tiers) {
            const allPackages: PricingPackage[] = [];
            pricingStructure.tiers.forEach((tier: any) => {
              tier.packages.forEach((pkg: any) => {
                allPackages.push({
                  id: pkg.id,
                  title: pkg.title,
                  packageType: pkg.packageType,
                  active: pkg.active !== false,
                });
              });
            });
            setPricingPackages(allPackages);
          }
        }

        // Load payment methods using Cloud Function (like iOS app)
        try {
          const { getFunctions, httpsCallable } = await import('firebase/functions');
          const functions = getFunctions(undefined, 'us-central1');
          const getPaymentMethodsDirectAdmin = httpsCallable(functions, 'getPaymentMethodsDirectAdmin');
          const result = await getPaymentMethodsDirectAdmin({ userId: clientId, orgId });
          const data = result.data as any;
          if (data?.paymentMethods) {
            const methodsData = data.paymentMethods.map((method: any) => ({
              id: method.id,
              brand: method.brand,
              last4: method.last4,
              expMonth: method.expMonth,
              expYear: method.expYear,
              isDefault: method.isDefault,
            }));
            console.log('Payment methods loaded via Cloud Function:', methodsData.length, methodsData);
            setPaymentMethods(methodsData);
          }
        } catch (error) {
          console.error('Error loading payment methods:', error);
          // Non-blocking error
        }

        // Load receipts/transactions
        const receiptsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', clientId),
          where('orgId', '==', orgId)
        );
        const receiptsSnap = await getDocs(receiptsQuery);
        const receiptsData = receiptsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        console.log('Receipts loaded:', receiptsData.length, receiptsData);
        const sortedReceipts = receiptsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        setReceipts(sortedReceipts);

      } catch (error) {
        console.error('Error loading client data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadClientData();
  }, [orgId, clientId, router]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48 mt-2" />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        
        {/* Content cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  // Filter passes by active pricing packages
  const getPassStatus = (pkg: LessonPackage) => {
    // Check if the package's pricing definition exists and is active
    const pricingPackage = pricingPackages.find(p => p.packageType === pkg.packageType);
    
    // If no pricing package found, treat as inactive (package was deleted or doesn't exist)
    if (!pricingPackage) {
      return false;
    }
    
    // Pass is active only if it has remaining lessons AND its pricing package is active
    return pkg.remainingLessons > 0 && pricingPackage.active === true;
  };

  const activePasses = packages.filter(getPassStatus);
  const expiredPasses = packages.filter(p => !getPassStatus(p));

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar, count: upcomingBookings.length },
    { id: 'history', label: 'History', icon: History, count: pastBookings.length },
    { id: 'passes', label: 'Passes', icon: Package, count: activePasses.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard, count: paymentMethods.length },
    { id: 'receipts', label: 'Receipts', icon: Receipt, count: receipts.length },
  ];

  return (
    <SchedulingSubmenu>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/clients')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-foreground/80">{client.email}</p>
            </div>
          </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white rounded-t-lg">
          <nav className="flex gap-1 p-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
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

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-sm">
          {activeTab === 'overview' && (
            <OverviewTab 
              client={client} 
              upcomingCount={upcomingBookings.length}
              activePackagesCount={activePasses.length}
              totalSessions={packages.reduce((sum, p) => sum + p.totalLessons, 0)}
              completedSessions={packages.reduce((sum, p) => sum + p.lessonsUsed, 0)}
            />
          )}
          {activeTab === 'upcoming' && (
            <UpcomingTab 
              upcomingLessons={upcomingLessons}
              upcomingClasses={upcomingClasses}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab 
              pastLessons={pastLessons}
              pastClasses={pastClasses}
            />
          )}
        {activeTab === 'passes' && <PassesTab activePasses={activePasses} expiredPasses={expiredPasses} />}
        {activeTab === 'documents' && <DocumentsTab documents={documents} />}
        {activeTab === 'payments' && <PaymentsTab methods={paymentMethods} />}
          {activeTab === 'receipts' && <ReceiptsTab receipts={receipts} />}
        </div>
      </div>
    </div>
    </SchedulingSubmenu>
  );
}

// Tab Components
function OverviewTab({ 
  client, 
  upcomingCount, 
  activePackagesCount, 
  totalSessions,
  completedSessions 
}: { 
  client: ClientData; 
  upcomingCount: number; 
  activePackagesCount: number;
  totalSessions: number;
  completedSessions: number;
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{upcomingCount}</div>
            <div className="text-sm text-foreground/80">Upcoming Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activePackagesCount}</div>
            <div className="text-sm text-foreground/80">Active Pricing Packages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{completedSessions}</div>
            <div className="text-sm text-foreground/80">Completed Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
            <div className="text-sm text-foreground/80">Total Sessions Purchased</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-foreground/80">Name</p>
              <p className="font-medium">{client.firstName} {client.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/80">Email</p>
              <p className="font-medium">{client.email}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/80">Phone</p>
              <p className="font-medium">{client.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/80">Member Since</p>
              <p className="font-medium">
                {client.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UpcomingTab({ upcomingLessons, upcomingClasses }: { 
  upcomingLessons: Booking[]; 
  upcomingClasses: Booking[];
}) {
  return (
    <div className="space-y-6">
      {/* Upcoming Lessons */}
      <div>
        <h3 className="text-lg font-semibold mb-4 px-6">Upcoming Lessons</h3>
        {upcomingLessons.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No upcoming lessons scheduled</p>
          </div>
        ) : (
          <div className="px-6">
            <div className="space-y-3">
              {upcomingLessons.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {booking.startTime.toDate().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">
                          {booking.startTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                        {booking.athleteNames && booking.athleteNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Athletes: {booking.athleteNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'booked' ? 'bg-green-100 text-green-700' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-foreground'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Classes */}
      <div>
        <h3 className="text-lg font-semibold mb-4 px-6">Upcoming Classes</h3>
        {upcomingClasses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No upcoming classes scheduled</p>
          </div>
        ) : (
          <div className="px-6">
            <div className="space-y-3">
              {upcomingClasses.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {booking.startTime.toDate().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">
                          {booking.startTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                        {booking.athleteNames && booking.athleteNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Athletes: {booking.athleteNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'booked' ? 'bg-green-100 text-green-700' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-foreground'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ pastLessons, pastClasses }: { 
  pastLessons: Booking[]; 
  pastClasses: Booking[];
}) {
  return (
    <div className="space-y-6">
      {/* Past Lessons */}
      <div>
        <h3 className="text-lg font-semibold mb-4 px-6">Past Lessons</h3>
        {pastLessons.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No past lessons</p>
          </div>
        ) : (
          <div className="px-6">
            <div className="space-y-3">
              {pastLessons.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {booking.startTime.toDate().toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">
                          {booking.startTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                        {booking.athleteNames && booking.athleteNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Athletes: {booking.athleteNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-foreground'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Past Classes */}
      <div>
        <h3 className="text-lg font-semibold mb-4 px-6">Past Classes</h3>
        {pastClasses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No past classes</p>
          </div>
        ) : (
          <div className="px-6">
            <div className="space-y-3">
              {pastClasses.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {booking.startTime.toDate().toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">
                          {booking.startTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                        {booking.athleteNames && booking.athleteNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Athletes: {booking.athleteNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-foreground'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PassesTab({ activePasses, expiredPasses }: { activePasses: LessonPackage[]; expiredPasses: LessonPackage[] }) {
  if (activePasses.length === 0 && expiredPasses.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No passes purchased</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {activePasses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Active Passes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePasses.map((pkg) => (
              <Card key={pkg.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-foreground">{pkg.packageName || pkg.packageType}</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-foreground/80">
                        <span className="font-medium text-primary">{pkg.remainingLessons}</span> of {pkg.totalLessons} sessions remaining
                      </p>
                      <p className="text-foreground/80">
                        Expires: {pkg.expirationDate.toDate().toLocaleDateString()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Purchased: {pkg.purchaseDate.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {expiredPasses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Used/Expired Passes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiredPasses.map((pkg) => (
              <Card key={pkg.id} className="opacity-60">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-foreground">{pkg.packageName || pkg.packageType}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-foreground/80 text-xs font-medium rounded-full">
                        Used
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-foreground/80">
                      <p>{pkg.lessonsUsed} of {pkg.totalLessons} sessions used</p>
                      <p className="text-xs">
                        Purchased: {pkg.purchaseDate.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No documents uploaded</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.uploadedAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  View
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PaymentsTab({ methods }: { methods: PaymentMethod[] }) {
  if (methods.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No payment methods on file</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {methods.map((method) => (
          <Card key={method.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CreditCard className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="font-medium text-foreground">
                      {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                    </p>
                    <p className="text-sm text-foreground/80">
                      Expires {method.expMonth || method.expiryMonth}/{method.expYear || method.expiryYear}
                    </p>
                  </div>
                </div>
                {method.isDefault && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Default
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReceiptsTab({ receipts }: { receipts: Transaction[] }) {
  if (receipts.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No purchase receipts</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {receipts.map((receipt) => (
          <Card key={receipt.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {receipt.description || receipt.packageName || 'Purchase'}
                  </p>
                  <p className="text-sm text-foreground/80 mt-1">
                    {receipt.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  {receipt.stripePaymentIntentId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {receipt.stripePaymentIntentId}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    ${((receipt.amount || 0) / 100).toFixed(2)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${
                      receipt.status === 'succeeded'
                        ? 'bg-green-100 text-green-700'
                        : receipt.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {receipt.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={null}>
      <ClientDetailContent />
    </Suspense>
  );
}
