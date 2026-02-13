'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, AthleteInfo } from '@/types';
import { Save, X, User as UserIcon, Search, Calendar, Package, FileText, CreditCard, Receipt, History } from 'lucide-react';
import { logClientProfileUpdated } from '@/lib/activity-logger';

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

        // Load documents
        const docsSnap = await getDocs(
          collection(db, 'users', selectedClient.id, 'documents')
        );
        const docsData = docsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Document[];
        setDocuments(docsData);

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
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
    const email = (client.email || client.emailAddress || '').toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const handleClientSelect = (client: User) => {
    setSelectedClient(client);
    setEditedClient(JSON.parse(JSON.stringify(client)));
    setActiveTab('profile');
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
      
      alert('Client profile updated successfully!');
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client profile. Please try again.');
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
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent touch-manipulation text-base"
          />
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
                onClick={() => router.push(`/clients/detail?id=${client.id}`)}
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
    </SchedulingSubmenu>
  );
}
