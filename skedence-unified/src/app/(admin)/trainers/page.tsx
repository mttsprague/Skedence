'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { Search, Mail, Phone, UserCog, Calendar, CheckCircle2, XCircle, Plus, X, RotateCcw } from 'lucide-react';
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Trainers</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage trainers and view their schedules</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#274785] transition-colors font-medium"
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
            className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent touch-manipulation text-base"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'active'
                ? 'text-[#3258A3] border-b-2 border-[#3258A3]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active ({trainers.filter(t => t.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'inactive'
                ? 'text-[#3258A3] border-b-2 border-[#3258A3]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inactive ({trainers.filter(t => !t.isActive).length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">
              {searchQuery 
                ? `No ${activeTab} trainers found matching your search.` 
                : `No ${activeTab} trainers yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-lg active:shadow-xl transition-shadow touch-manipulation">
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
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {trainer.firstName} {trainer.lastName}
                      </h3>
                      {(trainer.email || trainer.emailAddress) && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Mail className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{trainer.email || trainer.emailAddress}</span>
                        </div>
                      )}
                      {trainer.phone && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
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
                              <span className="text-gray-500">Inactive</span>
                            </>
                          )}
                        </div>
                        {!trainer.isActive && (
                          <button
                            onClick={() => handleReactivateTrainer(trainer.id)}
                            disabled={reactivatingId === trainer.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#3258A3] text-white rounded-lg hover:bg-[#274785] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Trainers</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{trainers.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {trainers.filter(t => t.isActive).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-500 mt-1">
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
              <h2 className="text-xl font-bold text-gray-900">Add New Trainer</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTrainer({ firstName: '', lastName: '', email: '' });
                  setAddError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={newTrainer.firstName}
                  onChange={(e) => setNewTrainer({ ...newTrainer, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newTrainer.lastName}
                  onChange={(e) => setNewTrainer({ ...newTrainer, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {addError}
                </div>
              )}
              <div className="text-xs text-gray-500">
                The trainer will receive an email with instructions to set up their password and access the app.
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTrainer({ firstName: '', lastName: '', email: '' });
                  setAddError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTrainer}
                disabled={isAdding || !newTrainer.firstName || !newTrainer.lastName || !newTrainer.email}
                className="flex-1 px-4 py-2 bg-[#3258A3] text-white rounded-lg hover:bg-[#274785] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add Trainer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SchedulingSubmenu>
  );
}
