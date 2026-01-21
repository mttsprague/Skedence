'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { Search, Mail, Phone, UserCog, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export default function TrainersPage() {
  const { orgId } = useAuth();
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!orgId) return;

    async function loadTrainers() {
      try {
        const trainersQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'trainer'),
          orderBy('firstName', 'asc')
        );
        const snapshot = await getDocs(trainersQuery);
        const trainersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setTrainers(trainersData);
      } catch (error) {
        console.error('Error loading trainers:', error);
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
    return fullName.includes(search) || email.includes(search);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trainers</h1>
          <p className="text-gray-600 mt-2">Manage trainers and view their schedules</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search trainers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">
              {searchQuery ? 'No trainers found matching your search.' : 'No trainers yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
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
                      <div className="flex items-center text-sm mt-2">
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
    </DashboardLayout>
  );
}
