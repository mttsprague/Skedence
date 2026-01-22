'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, doc, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Clock, User, MapPin, X } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface Booking {
  id: string;
  clientId: string;
  trainerId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
  clientName?: string;
  trainerName?: string;
  status?: string;
}

export default function SchedulePage() {
  const { orgId } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  useEffect(() => {
    if (!orgId) return;

    async function loadBookings() {
      try {
        console.log('Schedule: Loading bookings for orgId:', orgId);
        const startDate = viewMode === 'day' 
          ? selectedDate 
          : startOfWeek(selectedDate, { weekStartsOn: 0 });
        const endDate = viewMode === 'day'
          ? new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
          : addDays(startDate, 7);

        console.log('Schedule: Date range:', startDate, 'to', endDate);
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('orgId', '==', orgId),
          where('startTime', '>=', Timestamp.fromDate(startDate)),
          where('startTime', '<', Timestamp.fromDate(endDate)),
          orderBy('startTime', 'asc')
        );

        const snapshot = await getDocs(bookingsQuery);
        console.log('Schedule: Found', snapshot.size, 'bookings');
        const bookingsData: Booking[] = [];

        for (const bookingDoc of snapshot.docs) {
          const data = bookingDoc.data() as any; // Use any to access both clientId and clientUID
          const actualClientId = data.clientUID || data.clientId; // iOS uses clientUID, web might use clientId
          console.log('Schedule: Booking', bookingDoc.id, 'has clientUID:', data.clientUID, 'clientId:', data.clientId, 'trainerId:', data.trainerId);
          
          // Fetch client name from users collection - use direct document get
          let clientName = 'Unknown Client';
          if (actualClientId) {
            try {
              const clientDocRef = doc(db, 'users', actualClientId);
              const clientDoc = await getDoc(clientDocRef);
              if (clientDoc.exists()) {
                const clientData = clientDoc.data();
                clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Unknown Client';
              }
            } catch (err) {
              console.error('Schedule: Error fetching client', actualClientId, ':', err);
            }
          } else {
            console.warn('Schedule: Booking', bookingDoc.id, 'has no clientUID or clientId');
          }

          // Fetch trainer name from trainers collection - use direct document get
          let trainerName = 'Unknown Trainer';
          if (data.trainerId) {
            try {
              const trainerDocRef = doc(db, 'trainers', data.trainerId);
              const trainerDoc = await getDoc(trainerDocRef);
              if (trainerDoc.exists()) {
                const trainerData = trainerDoc.data();
                trainerName = `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim() || 'Unknown Trainer';
              }
            } catch (err) {
              console.error('Schedule: Error fetching trainer', data.trainerId, ':', err);
            }
          } else {
            console.warn('Schedule: Booking', bookingDoc.id, 'has no trainerId');
          }

          bookingsData.push({
            ...data,
            id: bookingDoc.id,
            clientName,
            trainerName,
          });
        }

        console.log('Schedule: Loaded', bookingsData.length, 'bookings with details');
        setBookings(bookingsData);
      } catch (error) {
        console.error('Schedule: Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [orgId, selectedDate, viewMode]);

  const weekDays = viewMode === 'week' 
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate, { weekStartsOn: 0 }), i))
    : [selectedDate];

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(booking.startTime.toDate(), day)
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600 mt-2">View and manage all bookings</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-lg border">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'day'
                    ? 'bg-[#3258A3] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } rounded-l-lg transition-colors`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'week'
                    ? 'bg-[#3258A3] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } rounded-r-lg transition-colors`}
              >
                Week
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg border px-4 py-2">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - (viewMode === 'day' ? 24 : 7 * 24) * 60 * 60 * 1000))}
                className="text-gray-600 hover:text-gray-900"
              >
                ←
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 text-sm font-medium text-[#3258A3] hover:bg-blue-50 rounded"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + (viewMode === 'day' ? 24 : 7 * 24) * 60 * 60 * 1000))}
                className="text-gray-600 hover:text-gray-900"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const dayBookings = getBookingsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Card key={index} className={isToday ? 'ring-2 ring-[#3258A3]' : ''}>
                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <p className="text-sm font-medium text-gray-600">
                        {format(day, 'EEE')}
                      </p>
                      <p className={`text-2xl font-bold ${isToday ? 'text-[#3258A3]' : 'text-gray-900'}`}>
                        {format(day, 'd')}
                      </p>
                      <p className="text-xs text-gray-500">{format(day, 'MMM')}</p>
                    </div>

                    <div className="space-y-2">
                      {dayBookings.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No bookings</p>
                      ) : (
                        dayBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"
                          >
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(booking.startTime.toDate(), 'h:mm a')}</span>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{booking.clientName}</p>
                            <p className="text-xs text-gray-600 truncate">{booking.trainerName}</p>
                            {booking.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{booking.location}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-[#3258A3] mt-1">{bookings.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-[#3258A3] mt-1">{bookings.length}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
