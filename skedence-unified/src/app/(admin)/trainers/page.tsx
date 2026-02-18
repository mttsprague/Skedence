'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { collection, query, where, getDocs, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { Search, Mail, Phone, UserCog, Calendar, CheckCircle2, XCircle, Plus, X, RotateCcw, FileText } from 'lucide-react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { logTrainerCreated, logTrainerActivated, logTrainerDeactivated } from '@/lib/activity-logger';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

export default function TrainersPage() {
  const { orgId, user, userData } = useAuthHook();
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ firstName: '', lastName: '', email: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  
  // Edit trainer sheet state
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthday: '',
    trainerDescription: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function loadTrainers() {
      try {
        // Query trainers collection directly with orgId filter (matches iOS app)
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('orgId', '==', orgId)
        );
        const snapshot = await getDocs(trainersQuery);
        const trainersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || data.emailAddress || '',
            phone: data.phoneNumber || data.phone || '',
            role: data.role || 'trainer',
            isActive: data.active !== false,
          };
        }) as User[];
        setTrainers(trainersData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')));
      } catch (error) {
        console.error('Trainers: Error loading:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTrainers();
  }, [orgId]);

  const filteredTrainers = trainers.filter(trainer => {
    const search = searchQuery.toLowerCase();
    const fullName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.toLowerCase();
    const email = (trainer.email || trainer.emailAddress || '').toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search);
    const matchesTab = activeTab === 'active' ? trainer.isActive : !trainer.isActive;
    return matchesSearch && matchesTab;
  });

  const handleReactivateTrainer = async (trainerId: string) => {
    if (!orgId) return;
    
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return;
    
    setReactivatingId(trainerId);
    try {
      // Update trainer document to set active = true
      await updateDoc(doc(db, 'trainers', trainerId), {
        active: true
      });

      // Also update the orgMembers document
      const memberDocId = `${trainerId}_${orgId}`;
      await updateDoc(doc(db, 'orgMembers', memberDocId), {
        isActive: true
      });

      // Log activity
      if (user && userData) {
        await logTrainerActivated({
          orgId: orgId,
          actorId: user.uid,
          actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
          actorRole: 'admin',
          trainerId: trainerId,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
        });
      }

      // Refresh trainers list
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(trainersQuery);
      const trainersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || data.emailAddress || '',
          phone: data.phoneNumber || data.phone || '',
          role: data.role || 'trainer',
          isActive: data.active !== false,
        };
      }) as User[];
      setTrainers(trainersData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')));
    } catch (error) {
      console.error('❌ Error reactivating trainer:', error);
    } finally {
      setReactivatingId(null);
    }
  };

  const handleDeactivateTrainer = async (trainerId: string) => {
    if (!orgId) return;
    
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) return;
    
    if (!confirm(`Are you sure you want to deactivate ${trainer.firstName} ${trainer.lastName}? They will no longer be able to access the system.`)) {
      return;
    }
    
    setReactivatingId(trainerId);
    try {
      // Update trainer document to set active = false
      await updateDoc(doc(db, 'trainers', trainerId), {
        active: false
      });

      // Also update the orgMembers document
      const memberDocId = `${trainerId}_${orgId}`;
      await updateDoc(doc(db, 'orgMembers', memberDocId), {
        isActive: false
      });

      // Log activity
      if (user && userData) {
        await logTrainerDeactivated({
          orgId: orgId,
          actorId: user.uid,
          actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
          actorRole: 'admin',
          trainerId: trainerId,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
        });
      }

      // Refresh trainers list
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(trainersQuery);
      const trainersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || data.emailAddress || '',
          phone: data.phoneNumber || data.phone || '',
          role: data.role || 'trainer',
          isActive: data.active !== false,
        };
      }) as User[];
      setTrainers(trainersData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')));
    } catch (error) {
      console.error('❌ Error deactivating trainer:', error);
    } finally {
      setReactivatingId(null);
    }
  };

  const handleOpenEditSheet = async (trainer: User) => {
    setSelectedTrainer(trainer);
    setSaveError(null);
    
    // Load full trainer data including birthday and description
    try {
      const trainerDoc = await getDoc(doc(db, 'trainers', trainer.id));
      const data = trainerDoc.data();
      
      setEditForm({
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        email: data?.email || '',
        phone: data?.phoneNumber || data?.phone || '',
        birthday: data?.birthday || '',
        trainerDescription: data?.trainerDescription || ''
      });
      setShowEditSheet(true);
    } catch (error) {
      console.error('Error loading trainer data:', error);
      // Still open the sheet with available data
      setEditForm({
        firstName: trainer.firstName || '',
        lastName: trainer.lastName || '',
        email: trainer.email || '',
        phone: trainer.phone || '',
        birthday: '',
        trainerDescription: ''
      });
      setShowEditSheet(true);
    }
  };

  const handleSaveTrainer = async () => {
    if (!selectedTrainer || !orgId) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await updateDoc(doc(db, 'trainers', selectedTrainer.id), {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phoneNumber: editForm.phone,
        birthday: editForm.birthday,
        trainerDescription: editForm.trainerDescription
      });

      // Refresh trainers list
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(trainersQuery);
      const trainersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || data.emailAddress || '',
          phone: data.phoneNumber || data.phone || '',
          role: data.role || 'trainer',
          isActive: data.active !== false,
        };
      }) as User[];
      setTrainers(trainersData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')));

      // Close sheet
      setShowEditSheet(false);
      setSelectedTrainer(null);
    } catch (error) {
      console.error('❌ Error saving trainer:', error);
      setSaveError('Failed to save trainer information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTrainer = async () => {
    if (!orgId || !newTrainer.firstName || !newTrainer.lastName || !newTrainer.email) {
      setAddError('Please fill in all fields');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      // Generate a unique ID for this trainer
      const trainerRef = doc(collection(db, 'trainers'));
      const trainerId = trainerRef.id;
      const userId = trainerId; // Trainers use their trainerId as userId

      // Generate secure setup token (valid for 7 days)
      const setupToken = crypto.randomUUID();
      const setupTokenExpiry = new Date();
      setupTokenExpiry.setDate(setupTokenExpiry.getDate() + 7);

      // Create trainer document (matches iOS app structure)
      const trainerData = {
        firstName: newTrainer.firstName,
        lastName: newTrainer.lastName,
        email: newTrainer.email,
        orgId: orgId,
        emailAddress: newTrainer.email,
        needsPasswordSetup: true,
        setupToken: setupToken,
        setupTokenExpiry: Timestamp.fromDate(setupTokenExpiry),
        active: true,
        createdAt: Timestamp.now(),
      };

      await setDoc(trainerRef, trainerData);
      console.log('✅ Created trainer:', trainerId);

      // Create orgMembers entry
      const memberData = {
        userId: userId,
        orgId: orgId,
        role: 'trainer',
        isActive: true,
        joinedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'orgMembers', `${userId}_${orgId}`), memberData);
      console.log('✅ Created orgMember for trainer:', userId);

      // Log activity
      if (user && userData) {
        await logTrainerCreated({
          orgId: orgId,
          actorId: user.uid,
          actorName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email?.split('@')[0] || 'Admin',
          actorRole: 'owner', // Assuming only owner/admin can add trainers
          trainerId: trainerId,
          trainerName: `${newTrainer.firstName} ${newTrainer.lastName}`,
          trainerEmail: newTrainer.email,
        });
      }

      // The trainer will receive an invitation email via Cloud Function
      console.log('📧 New trainer created. They will receive invitation email at:', newTrainer.email);

      // Refresh trainers list
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(trainersQuery);
      const trainersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || data.emailAddress || '',
          phone: data.phoneNumber || data.phone || '',
          role: data.role || 'trainer',
          isActive: data.active !== false,
        };
      }) as User[];
      setTrainers(trainersData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '')));

      // Close modal and reset form
      setShowAddModal(false);
      setNewTrainer({ firstName: '', lastName: '', email: '' });
    } catch (error) {
      console.error('❌ Error adding trainer:', error);
      setAddError('Failed to add trainer. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <SchedulingSubmenu>
      <div className="p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Trainers</h1>
            <p className="text-sm sm:text-base text-foreground/80 mt-1 sm:mt-2">Manage trainers and view their schedules</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#274785] transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Trainer
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search trainers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent touch-manipulation text-base"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'active'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({trainers.filter(t => t.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'inactive'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inactive ({trainers.filter(t => !t.isActive).length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-muted-foreground">
              {searchQuery 
                ? `No ${activeTab} trainers found matching your search.` 
                : `No ${activeTab} trainers yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTrainers.map((trainer) => (
              <div 
                key={trainer.id}
                onClick={() => handleOpenEditSheet(trainer)}
                className="cursor-pointer"
              >
                <Card className="hover:shadow-lg active:shadow-xl transition-shadow touch-manipulation">
                  <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-full ${
                      trainer.isActive 
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600' 
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    } flex items-center justify-center text-white font-bold text-lg`}>
                      {trainer.firstName?.[0]}{trainer.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {trainer.firstName} {trainer.lastName}
                      </h3>
                      {(trainer.email || trainer.emailAddress) && (
                        <div className="flex items-center text-sm text-foreground/80 mt-1">
                          <Mail className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{trainer.email || trainer.emailAddress}</span>
                        </div>
                      )}
                      {trainer.phone && (
                        <div className="flex items-center text-sm text-foreground/80 mt-1">
                          <Phone className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span>{trainer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-sm">
                          {trainer.isActive ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" />
                              <span className="text-green-600 font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1.5 text-gray-400" />
                              <span className="text-muted-foreground">Inactive</span>
                            </>
                          )}
                        </div>
                        {trainer.isActive ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivateTrainer(trainer.id);
                            }}
                            disabled={reactivatingId === trainer.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {reactivatingId === trainer.id ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactivateTrainer(trainer.id);
                            }}
                            disabled={reactivatingId === trainer.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-[#274785] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {reactivatingId === trainer.id ? 'Reactivating...' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-foreground/80">Total Trainers</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{trainers.length}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/80">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {trainers.filter(t => t.isActive).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-foreground/80">Inactive</p>
              <p className="text-2xl font-bold text-muted-foreground mt-1">
                {trainers.filter(t => !t.isActive).length}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-foreground">Add New Trainer</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTrainer({ firstName: '', lastName: '', email: '' });
                  setAddError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newTrainer.firstName}
                  onChange={(e) => setNewTrainer({ ...newTrainer, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newTrainer.lastName}
                  onChange={(e) => setNewTrainer({ ...newTrainer, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {addError}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                The trainer will receive an email with instructions to set up their password and access the app.
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-background">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTrainer({ firstName: '', lastName: '', email: '' });
                  setAddError(null);
                }}
                className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-gray-100 transition-colors font-medium"
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTrainer}
                disabled={isAdding || !newTrainer.firstName || !newTrainer.lastName || !newTrainer.email}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#274785] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add Trainer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trainer Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">Edit Trainer</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Header with Avatar */}
            <div className="flex items-center gap-4 pb-6 border-b">
              <div className={`w-16 h-16 rounded-full ${
                selectedTrainer?.isActive 
                  ? 'bg-gradient-to-br from-teal-500 to-teal-600' 
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              } flex items-center justify-center text-white font-bold text-2xl`}>
                {editForm.firstName?.[0]}{editForm.lastName?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {editForm.firstName} {editForm.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{editForm.email}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Birthday
                </label>
                <input
                  type="date"
                  value={editForm.birthday}
                  onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Trainer Bio / Description
                </label>
                <textarea
                  value={editForm.trainerDescription}
                  onChange={(e) => setEditForm({ ...editForm, trainerDescription: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                  placeholder="Enter a professional bio that clients will see. Include experience, certifications, specialties, coaching philosophy, etc."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This bio will be visible to clients when they select this trainer.
                </p>
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {saveError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white pb-4">
              <button
                onClick={() => setShowEditSheet(false)}
                className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-gray-100 transition-colors font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrainer}
                disabled={isSaving || !editForm.firstName || !editForm.lastName || !editForm.email}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#274785] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </SchedulingSubmenu>
  );
}
