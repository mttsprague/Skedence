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

type TabType = 'profile' | 'upcoming' | 'history' | 'passes' | 'documents' | 'payments' | 'waivers';

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
  const [waivers, setWaivers] = useState<Waiver[]>([]);

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

        // Load payment methods
        const paymentsSnap = await getDocs(
          collection(db, 'users', selectedClient.id, 'paymentMethods')
        );
        const paymentsData = paymentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PaymentMethod[];
        setPaymentMethods(paymentsData);

        // Load waivers
        const waiversSnap = await getDocs(
          collection(db, 'users', selectedClient.id, 'waivers')
        );
        const waiversData = waiversSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Waiver[];
        setWaivers(waiversData);

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
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage your client list and edit profiles</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent touch-manipulation text-base"
          />
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client to View/Edit {filteredClients.length < clients.length && `(${filteredClients.length} of ${clients.length})`}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.id === e.target.value);
                  if (client) handleClientSelect(client);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent text-base bg-white"
              >
                <option value="">-- Select a client --</option>
                {filteredClients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} {client.email ? `(${client.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {selectedClient && editedClient && (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white rounded-t-lg">
              <nav className="flex gap-1 p-2 overflow-x-auto">
                {[
                  { id: 'profile' as TabType, label: 'Profile', icon: UserIcon },
                  { id: 'upcoming' as TabType, label: 'Upcoming', icon: Calendar, count: upcomingBookings.length },
                  { id: 'history' as TabType, label: 'History', icon: History, count: pastBookings.length },
                  { id: 'passes' as TabType, label: 'Passes', icon: Package, count: packages.filter(p => p.remainingLessons > 0).length },
                  { id: 'documents' as TabType, label: 'Documents', icon: FileText, count: documents.length },
                  { id: 'payments' as TabType, label: 'Payments', icon: CreditCard, count: paymentMethods.length },
                  { id: 'waivers' as TabType, label: 'Waivers', icon: Receipt, count: waivers.length },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
            {tabDataLoading && activeTab !== 'profile' ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {activeTab === 'profile' && (
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Client Profile</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#3258A3] rounded-lg hover:bg-[#2a4a8a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={editedClient.firstName || ''}
                        onChange={(e) => updateEditedClient('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={editedClient.lastName || ''}
                        onChange={(e) => updateEditedClient('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editedClient.emailAddress || editedClient.email || ''}
                        onChange={(e) => {
                          updateEditedClient('emailAddress', e.target.value);
                          updateEditedClient('email', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editedClient.phoneNumber || editedClient.phone || ''}
                        onChange={(e) => {
                          updateEditedClient('phoneNumber', e.target.value);
                          updateEditedClient('phone', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Athletes</h3>
                    <button
                      onClick={addAthlete}
                      className="px-3 py-1 text-sm font-medium text-white bg-[#3258A3] rounded-lg hover:bg-[#2a4a8a]"
                    >
                      + Add Athlete
                    </button>
                  </div>
                  
                  {(editedClient.athletes || []).map((athlete: AthleteInfo, index: number) => (
                    <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">Athlete {index + 1}</h4>
                        <button
                          onClick={() => removeAthlete(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                        <label htmlFor={`athlete-${index}-firstName`} className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                          type="text"
                          id={`athlete-${index}-firstName`}
                          name={`athlete-${index}-firstName`}
                            value={athlete.firstName || ''}
                            onChange={(e) => updateAthlete(index, 'firstName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                        <label htmlFor={`athlete-${index}-lastName`} className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          id={`athlete-${index}-lastName`}
                          name={`athlete-${index}-lastName`}
                            value={athlete.lastName || ''}
                            onChange={(e) => updateAthlete(index, 'lastName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                        <label htmlFor={`athlete-${index}-birthday`} className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                        <input
                          type="text"
                          id={`athlete-${index}-birthday`}
                          name={`athlete-${index}-birthday`}
                            placeholder="MM/DD/YYYY"
                            value={athlete.birthday || ''}
                            onChange={(e) => updateAthlete(index, 'birthday', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                          <label htmlFor={`athlete-${index}-team`} className="block text-sm font-medium text-gray-700 mb-1">School/Club Team</label>
                          <input
                            type="text"
                            id={`athlete-${index}-team`}
                            name={`athlete-${index}-team`}
                            value={athlete.schoolClubTeam || ''}
                            onChange={(e) => updateAthlete(index, 'schoolClubTeam', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                          <label htmlFor={`athlete-${index}-experience`} className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                          <select
                            id={`athlete-${index}-experience`}
                            name={`athlete-${index}-experience`}
                            value={athlete.experienceLevel || 'Beginner'}
                            onChange={(e) => updateAthlete(index, 'experienceLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`athlete-${index}-position`} className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                          <input
                            type="text"
                            id={`athlete-${index}-position`}
                            name={`athlete-${index}-position`}
                            value={athlete.position || ''}
                            onChange={(e) => updateAthlete(index, 'position', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!editedClient.athletes || editedClient.athletes.length === 0) && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Athlete 1 (Legacy)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="legacy-athlete-firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            id="legacy-athlete-firstName"
                            name="legacy-athlete-firstName"
                            value={editedClient.athleteFirstName || ''}
                            onChange={(e) => updateEditedClient('athleteFirstName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                          <label htmlFor="legacy-athlete-lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            id="legacy-athlete-lastName"
                            name="legacy-athlete-lastName"
                            value={editedClient.athleteLastName || ''}
                            onChange={(e) => updateEditedClient('athleteLastName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                          <label htmlFor="legacy-athlete-birthday" className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                          <input
                            type="text"
                            id="legacy-athlete-birthday"
                            name="legacy-athlete-birthday"
                            placeholder="MM/DD/YYYY"
                            value={editedClient.athleteBirthday || ''}
                            onChange={(e) => updateEditedClient('athleteBirthday', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                        <div>
                          <label htmlFor="legacy-athlete-position" className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                          <input
                            type="text"
                            id="legacy-athlete-position"
                            name="legacy-athlete-position"
                            value={editedClient.athletePosition || ''}
                            onChange={(e) => updateEditedClient('athletePosition', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="emergency-contact-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        id="emergency-contact-name"
                        name="emergency-contact-name"
                        value={editedClient.emergencyContactName || ''}
                        onChange={(e) => updateEditedClient('emergencyContactName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                    <div>
                      <label htmlFor="emergency-contact-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        id="emergency-contact-phone"
                        name="emergency-contact-phone"
                        value={editedClient.emergencyContactNumber || ''}
                        onChange={(e) => updateEditedClient('emergencyContactNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="referred-by" className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                      <input
                        type="text"
                        id="referred-by"
                        name="referred-by"
                        value={editedClient.referredBy || ''}
                        onChange={(e) => updateEditedClient('referredBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                    <div>
                      <label htmlFor="notes-for-coach" className="block text-sm font-medium text-gray-700 mb-1">Notes for Coach</label>
                      <textarea
                        id="notes-for-coach"
                        name="notes-for-coach"
                        value={editedClient.notesForCoach || ''}
                        onChange={(e) => updateEditedClient('notesForCoach', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
                )}

                {activeTab === 'upcoming' && (
                  <Card>
                    <CardContent className="p-6">
                      {upcomingBookings.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p>No upcoming sessions scheduled</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {upcomingBookings.map((booking) => (
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'history' && (
                  <Card>
                    <CardContent className="p-6">
                      {pastBookings.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'passes' && (
                  <Card>
                    <CardContent className="p-6">
                      {packages.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p>No passes purchased</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {packages.filter(p => p.remainingLessons > 0).length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 text-gray-900">Active Passes</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {packages.filter(p => p.remainingLessons > 0).map((pkg) => (
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

                          {packages.filter(p => p.remainingLessons <= 0).length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 text-gray-900">Used/Expired Passes</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {packages.filter(p => p.remainingLessons <= 0).map((pkg) => (
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'documents' && (
                  <Card>
                    <CardContent className="p-6">
                      {documents.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p>No documents uploaded</p>
                        </div>
                      ) : (
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'payments' && (
                  <Card>
                    <CardContent className="p-6">
                      {paymentMethods.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
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
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'waivers' && (
                  <Card>
                    <CardContent className="p-6">
                      {waivers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                          <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p>No waivers signed</p>
                        </div>
                      ) : (
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
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        <div className="bg-white rounded-lg border p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-[#3258A3] mt-1">{clients.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Selected</p>
              <p className="text-2xl font-bold text-[#3258A3] mt-1">{selectedClient ? 1 : 0}</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </SchedulingSubmenu>
  );
}
