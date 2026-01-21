'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
        const clientsQuery = query(
          collection(db, 'organizations', orgId!, 'users'),
          where('role', '==', 'client'),
          orderBy('firstName', 'asc')
        );
        const snapshot = await getDocs(clientsQuery);
        const clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading clients:', error);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-2">Manage your client list and view details</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
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
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
