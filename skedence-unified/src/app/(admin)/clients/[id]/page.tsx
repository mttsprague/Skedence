'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Calendar, Package, FileText, CreditCard, User as UserIcon, Receipt, History } from 'lucide-react';

export const dynamicParams = true;

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
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface Waiver {
  id: string;
  athleteName: string;
  signedAt: Timestamp;
  ipAddress?: string;
}

type TabType = 'overview' | 'upcoming' | 'history' | 'passes' | 'documents' | 'payments' | 'waivers';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { orgId } = useAuth();
  const clientId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);

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

        // Load payment methods
        const paymentsSnap = await getDocs(
          collection(db, 'users', clientId, 'paymentMethods')
        );
        const paymentsData = paymentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PaymentMethod[];
        setPaymentMethods(paymentsData);

        // Load waivers
        const waiversSnap = await getDocs(
          collection(db, 'users', clientId, 'waivers')
        );
        const waiversData = waiversSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Waiver[];
        setWaivers(waiversData);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar, count: upcomingBookings.length },
    { id: 'history', label: 'History', icon: History, count: pastBookings.length },
    { id: 'passes', label: 'Passes', icon: Package, count: packages.filter(p => p.remainingLessons > 0).length },
    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard, count: paymentMethods.length },
    { id: 'waivers', label: 'Waivers', icon: Receipt, count: waivers.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
            <h1 className="text-3xl font-bold text-gray-900">
              {client.firstName} {client.lastName}
            </h1>
            <p className="text-gray-600">{client.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white rounded-t-lg">
          <nav className="flex gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#3258A3] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-700'
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
              activePassesCount={packages.filter(p => p.remainingLessons > 0).length}
              totalSessions={packages.reduce((sum, p) => sum + p.totalLessons, 0)}
              completedSessions={packages.reduce((sum, p) => sum + p.lessonsUsed, 0)}
            />
          )}
          {activeTab === 'upcoming' && <UpcomingTab bookings={upcomingBookings} />}
          {activeTab === 'history' && <HistoryTab bookings={pastBookings} />}
          {activeTab === 'passes' && <PassesTab packages={packages} />}
          {activeTab === 'documents' && <DocumentsTab documents={documents} />}
          {activeTab === 'payments' && <PaymentsTab methods={paymentMethods} />}
          {activeTab === 'waivers' && <WaiversTab waivers={waivers} />}
        </div>
      </div>
    </div>
  );
}

// Tab Components
function OverviewTab({ 
  client, 
  upcomingCount, 
  activePassesCount, 
  totalSessions,
  completedSessions 
}: { 
  client: ClientData; 
  upcomingCount: number; 
  activePassesCount: number;
  totalSessions: number;
  completedSessions: number;
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-[#3258A3]">{upcomingCount}</div>
            <div className="text-sm text-gray-600">Upcoming Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activePassesCount}</div>
            <div className="text-sm text-gray-600">Active Passes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{completedSessions}</div>
            <div className="text-sm text-gray-600">Completed Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
            <div className="text-sm text-gray-600">Total Sessions Purchased</div>
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
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{client.firstName} {client.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{client.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{client.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
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

function UpcomingTab({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No upcoming sessions scheduled</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {booking.startTime.toDate().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.startTime.toDate().toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="text-sm text-gray-600">with {booking.trainerName}</p>
                  {booking.athleteNames && booking.athleteNames.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Athletes: {booking.athleteNames.join(', ')}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  booking.status === 'booked' ? 'bg-green-100 text-green-700' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {booking.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No past sessions</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {booking.startTime.toDate().toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.startTime.toDate().toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="text-sm text-gray-600">with {booking.trainerName}</p>
                  {booking.athleteNames && booking.athleteNames.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Athletes: {booking.athleteNames.join(', ')}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {booking.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PassesTab({ packages }: { packages: LessonPackage[] }) {
  if (packages.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No passes purchased</p>
      </div>
    );
  }

  const activePackages = packages.filter(p => p.remainingLessons > 0);
  const expiredPackages = packages.filter(p => p.remainingLessons <= 0);

  return (
    <div className="p-6 space-y-6">
      {activePackages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Active Passes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePackages.map((pkg) => (
              <Card key={pkg.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-gray-900">{pkg.packageName || pkg.packageType}</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium text-[#3258A3]">{pkg.remainingLessons}</span> of {pkg.totalLessons} sessions remaining
                      </p>
                      <p className="text-gray-600">
                        Expires: {pkg.expirationDate.toDate().toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
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

      {expiredPackages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Used/Expired Passes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiredPackages.map((pkg) => (
              <Card key={pkg.id} className="opacity-60">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-gray-900">{pkg.packageName || pkg.packageType}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        Used
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
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
      <div className="p-12 text-center text-gray-500">
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
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {doc.uploadedAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-3 py-1.5 text-sm bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] transition-colors"
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
      <div className="p-12 text-center text-gray-500">
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
                    <p className="font-medium text-gray-900">
                      {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires {method.expiryMonth}/{method.expiryYear}
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

function WaiversTab({ waivers }: { waivers: Waiver[] }) {
  if (waivers.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No waivers signed</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {waivers.map((waiver) => (
          <Card key={waiver.id}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{waiver.athleteName}</p>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Signed
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Signed on {waiver.signedAt.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
                {waiver.ipAddress && (
                  <p className="text-xs text-gray-500">IP: {waiver.ipAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
