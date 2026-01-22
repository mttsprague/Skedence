'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { Search, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export default function ClientsPage() {
  const { orgId } = useAuth();
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!orgId) return;

    async function loadClients() {
      try {
        console.log('Clients: Loading for orgId:', orgId);
        // Query orgMembers to find all members in this org
        const membersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        console.log('Clients: Found', membersSnapshot.size, 'org members');
        
        const clientPromises = membersSnapshot.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data();
          console.log('Clients: Member role:', memberData.role, 'userId:', memberData.userId);
          // Only include clients (not trainers/admins)
          if (memberData.role !== 'client') return null;
          
          // Get user details from users collection
          const userDoc = await getDoc(doc(db, 'users', memberData.userId));
          if (!userDoc.exists()) return null;
          
          const userData = userDoc.data();
          return {
            id: memberData.userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.emailAddress || userData.email || '',
            phone: userData.phoneNumber || '',
            role: memberData.role,
            createdAt: memberData.joinedAt,
            isActive: userData.isActive !== false,
          } as User;
        });
        
        const clientsData = (await Promise.all(clientPromises))
          .filter((c): c is User => c !== null)
          .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        console.log('Clients: Loaded', clientsData.length, 'clients');
        setClients(clientsData);
      } catch (error) {
        console.error('Clients: Error loading:', error);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, [orgId]);

  const filteredClients = clients.filter(client => {
    const search = searchQuery.toLowerCase();
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
    const email = (client.email || client.emailAddress || '').toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage your client list and view details</p>
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

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">
              {searchQuery ? 'No clients found matching your search.' : 'No clients yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg active:shadow-xl transition-shadow cursor-pointer touch-manipulation">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3258A3] to-[#4A7CC7] flex items-center justify-center text-white font-bold text-lg">
                      {client.firstName?.[0]}{client.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      {(client.email || client.emailAddress) && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Mail className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{client.email || client.emailAddress}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.createdAt && (
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <Calendar className="h-4 w-4 mr-1.5" />
                          <span>
                            Joined {client.createdAt instanceof Date 
                              ? client.createdAt.toLocaleDateString() 
                              : new Date((client.createdAt as any).seconds * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="bg-white rounded-lg border p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-[#3258A3] mt-1">{clients.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Search</p>
              <p className="text-2xl font-bold text-[#3258A3] mt-1">{filteredClients.length}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
