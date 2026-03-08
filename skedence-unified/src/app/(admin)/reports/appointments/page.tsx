'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, addMonths, differenceInMinutes } from 'date-fns';
import { Download, Calendar, Filter, ChevronDown, ArrowUpDown, Users, Clock, TrendingUp } from 'lucide-react';
import { trackPageView, trackFeature } from '@/lib/analytics';
import { Skeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

interface Appointment {
  id: string;
  type: string;
  typeCategory: string;
  cost: number;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  duration: number; // in minutes
  trainerId?: string;
  trainerName: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  location?: string;
  athleteNames?: string[];
}

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
}

interface ChartData {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  'no-show': number;
  total: number;
}

type DateRangeType = 'month' | 'custom' | 'next-month';
type SortField = 'date' | 'client' | 'trainer' | 'type' | 'duration' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AppointmentsReportPage() {
  const { orgId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  
  // Advanced Filters
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'no-show'>('all');
  const [trainerFilter, setTrainerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState('');
  
  // Table Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Track page view
  useEffect(() => {
    trackPageView('/reports/appointments', 'Appointments Report');
  }, []);
  
  // Month options: 4 future + current + 24 past
  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    
    for (let i = 4; i >= -24; i--) {
      const date = addMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy') + (i === 0 ? ' (Current)' : i > 0 ? ' (Future)' : '')
      });
    }
    
    return options;
  })();

  useEffect(() => {
    if (!orgId) return;
    loadTrainers();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    loadAppointments();
  }, [orgId, dateRangeType, selectedMonth, customStartDate, customEndDate]);

  useEffect(() => {
    applyFilters();
  }, [appointments, statusFilter, trainerFilter, typeFilter, clientSearch]);

  // Keyboard shortcut: Ctrl+E to export
  useEffect(() => {
    const handleExport = () => exportToCSV();
    window.addEventListener('trigger-export', handleExport);
    return () => window.removeEventListener('trigger-export', handleExport);
  }, []); // Empty deps - exportToCSV uses local variables

  async function loadTrainers() {
    if (!orgId) return;
    try {
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(trainersQuery);
      const loadedTrainers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown'
        };
      });
      setTrainers(loadedTrainers);
    } catch (error) {
      console.error('Error loading trainers:', error);
    }
  }

  async function loadAppointments() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      if (dateRangeType === 'month') {
        startDate = startOfMonth(parseISO(`${selectedMonth}-01`));
        endDate = endOfMonth(startDate);
      } else if (dateRangeType === 'next-month') {
        const nextMonth = addMonths(new Date(), 1);
        startDate = startOfMonth(nextMonth);
        endDate = endOfMonth(nextMonth);
      } else {
        startDate = parseISO(customStartDate);
        endDate = parseISO(customEndDate);
      }

      const loadedAppointments: Appointment[] = [];

      // Load 1-on-1 bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('orgId', '==', orgId),
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      for (const docSnap of bookingsSnapshot.docs) {
        const data = docSnap.data();
        const startTime = data.startTime.toDate();
        const endTime = data.endTime.toDate();
        const duration = differenceInMinutes(endTime, startTime);
        const now = new Date();
        
        // Determine status based on Firestore data and date
        let status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' = 'scheduled';
        if (data.status === 'cancelled' || data.cancelled === true) {
          status = 'cancelled';
        } else if (data.status === 'no-show' || data.noShow === true) {
          status = 'no-show';
        } else if (data.status === 'completed') {
          status = 'completed';
        } else if (endTime < now) {
          // Past appointment with no explicit status = completed
          status = 'completed';
        } else {
          // Future appointment = scheduled
          status = 'scheduled';
        }
        
        // Build athlete names array - check all formats
        let athleteNames: string[] = [];
        
        // New format: athleteNames array
        if (data.athleteNames && Array.isArray(data.athleteNames)) {
          athleteNames = data.athleteNames.filter((name: string) => name && name.trim());
        }
        // Legacy format: athleteName + secondAthleteName
        else {
          if (data.athleteName && typeof data.athleteName === 'string' && data.athleteName.trim()) {
            athleteNames.push(data.athleteName.trim());
          }
          if (data.secondAthleteName && typeof data.secondAthleteName === 'string' && data.secondAthleteName.trim()) {
            athleteNames.push(data.secondAthleteName.trim());
          }
        }
        
        // Build type and category
        const athleteCount = athleteNames.length || 1;
        let type = 'Private Lesson';
        let typeCategory = 'private';
        
        if (athleteCount > 1) {
          type = `${athleteCount}-Athlete Private`;
          typeCategory = `${athleteCount}_athlete`;
        }
        
        // Get client info
        const clientId = data.clientUID || data.clientId;
        let clientName = 'Unknown Client';
        let clientEmail = '';
        
        if (clientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
              clientEmail = clientData.emailAddress || clientData.email || '';
            }
          } catch (err) {
            console.warn('Could not load client:', err);
          }
        }
        
        // Get trainer info
        let trainerName = 'Unknown Trainer';
        if (data.trainerId) {
          const t = trainers.find(tr => tr.id === data.trainerId);
          if (t) trainerName = t.name;
          else {
            try {
              const trainerDoc = await getDoc(doc(db, 'trainers', data.trainerId));
              if (trainerDoc.exists()) {
                const td = trainerDoc.data();
                trainerName = `${td.firstName || ''} ${td.lastName || ''}`.trim();
              }
            } catch (err) {
              // Silent fail - use basic info
            }
          }
        }
        
        loadedAppointments.push({
          id: docSnap.id,
          type,
          typeCategory,
          cost: data.cost || 80,
          startTime,
          endTime,
          status,
          duration,
          trainerId: data.trainerId,
          trainerName,
          clientId,
          clientName,
          clientEmail,
          location: data.location,
          athleteNames
        });
      }

      // Load group class registrations
      const classesQuery = query(
        collection(db, 'classes'),
        where('orgId', '==', orgId),
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );
      
      const classesSnapshot = await getDocs(classesQuery);
      
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        const startTime = classData.startTime.toDate();
        const endTime = classData.endTime.toDate();
        const duration = differenceInMinutes(endTime, startTime);
        const now = new Date();
        
        // Get trainer info
        let trainerName = 'Unknown Trainer';
        if (classData.trainerId) {
          const t = trainers.find(tr => tr.id === classData.trainerId);
          if (t) trainerName = t.name;
        }
        
        // Each participant is a separate appointment entry
        const participantIds = classData.participantIds || [];
        
        for (const clientId of participantIds) {
          let clientName = 'Unknown Client';
          let clientEmail = '';
          
          try {
            const clientDoc = await getDoc(doc(db, 'users', clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
              clientEmail = clientData.emailAddress || clientData.email || '';
            }
          } catch (err) {
            // Silent fail - use participant data
          }
          
          // Determine status for group class
          let status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' = 'scheduled';
          if (classData.status === 'cancelled') {
            status = 'cancelled';
          } else if (classData.status === 'completed') {
            status = 'completed';
          } else if (endTime < now) {
            // Past class = completed
            status = 'completed';
          } else {
            // Future class = scheduled
            status = 'scheduled';
          }
          
          loadedAppointments.push({
            id: `${classDoc.id}-${clientId}`,
            type: 'Group Class',
            typeCategory: 'class',
            cost: classData.price || 45,
            startTime,
            endTime,
            status,
            duration,
            trainerId: classData.trainerId,
            trainerName,
            clientId,
            clientName,
            clientEmail,
            location: classData.location
          });
        }
      }
      
      // DEMO DATA INJECTION - Only for specific admin and February 2026
      const isDemoUser = user?.email === 'mttsprague@gmail.com';
      const isFebruary2026 = dateRangeType === 'month' && selectedMonth === '2026-02';
      
      if (isDemoUser && isFebruary2026) {
        console.log('🎬 Injecting demo appointments for February 2026');
        
        // Generate realistic demo appointments throughout February
        const demoAppointments: Appointment[] = [
          // Week 1
          { id: 'demo_apt_1', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-02T09:00:00'), endTime: new Date('2026-02-02T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_1', clientName: 'Alex Johnson', clientEmail: 'alex@example.com', location: 'Court 1' },
          { id: 'demo_apt_2', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-02T10:30:00'), endTime: new Date('2026-02-02T11:30:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_2', clientName: 'Emma Davis', clientEmail: 'emma@example.com', location: 'Court 1' },
          { id: 'demo_apt_3', type: '2-Athlete Private', typeCategory: '2_athlete', cost: 120, startTime: new Date('2026-02-03T14:00:00'), endTime: new Date('2026-02-03T15:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_3', clientName: 'Taylor Smith', clientEmail: 'taylor@example.com', location: 'Court 2', athleteNames: ['Taylor Smith', 'Jordan Smith'] },
          { id: 'demo_apt_4', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-03T18:00:00'), endTime: new Date('2026-02-03T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_4', clientName: 'Chris Brown', clientEmail: 'chris@example.com', location: 'Main Court' },
          { id: 'demo_apt_5', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-04T16:00:00'), endTime: new Date('2026-02-04T17:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_3', trainerName: 'Coach Alex', clientId: 'demo_client_5', clientName: 'Jamie Wilson', clientEmail: 'jamie@example.com', location: 'Court 1' },
          { id: 'demo_apt_6', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-05T09:00:00'), endTime: new Date('2026-02-05T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_6', clientName: 'Morgan Lee', clientEmail: 'morgan@example.com', location: 'Court 1' },
          { id: 'demo_apt_7', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-05T18:00:00'), endTime: new Date('2026-02-05T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_7', clientName: 'Riley Garcia', clientEmail: 'riley@example.com', location: 'Main Court' },
          
          // Week 2 - Peak activity
          { id: 'demo_apt_8', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-09T08:00:00'), endTime: new Date('2026-02-09T09:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_8', clientName: 'Casey Martinez', clientEmail: 'casey@example.com', location: 'Court 1' },
          { id: 'demo_apt_9', type: '2-Athlete Private', typeCategory: '2_athlete', cost: 120, startTime: new Date('2026-02-09T10:00:00'), endTime: new Date('2026-02-09T11:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_9', clientName: 'Avery Rodriguez', clientEmail: 'avery@example.com', location: 'Court 1', athleteNames: ['Avery Rodriguez', 'Blake Rodriguez'] },
          { id: 'demo_apt_10', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-10T09:00:00'), endTime: new Date('2026-02-10T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_10', clientName: 'Quinn Hernandez', clientEmail: 'quinn@example.com', location: 'Court 2' },
          { id: 'demo_apt_11', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-10T18:00:00'), endTime: new Date('2026-02-10T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_11', clientName: 'Peyton Lopez', clientEmail: 'peyton@example.com', location: 'Main Court' },
          { id: 'demo_apt_12', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-11T14:00:00'), endTime: new Date('2026-02-11T15:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_3', trainerName: 'Coach Alex', clientId: 'demo_client_12', clientName: 'Drew Gonzalez', clientEmail: 'drew@example.com', location: 'Court 1' },
          { id: 'demo_apt_13', type: '3-Athlete Private', typeCategory: '3_athlete', cost: 160, startTime: new Date('2026-02-11T16:00:00'), endTime: new Date('2026-02-11T17:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_13', clientName: 'Cameron Wilson', clientEmail: 'cameron@example.com', location: 'Court 2', athleteNames: ['Cameron Wilson', 'Dakota Wilson', 'Ellis Wilson'] },
          { id: 'demo_apt_14', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-12T09:00:00'), endTime: new Date('2026-02-12T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_14', clientName: 'Skylar Anderson', clientEmail: 'skylar@example.com', location: 'Court 1' },
          { id: 'demo_apt_15', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-12T18:00:00'), endTime: new Date('2026-02-12T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_15', clientName: 'Sage Thomas', clientEmail: 'sage@example.com', location: 'Main Court' },
          { id: 'demo_apt_16', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-13T10:00:00'), endTime: new Date('2026-02-13T11:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_16', clientName: 'River Taylor', clientEmail: 'river@example.com', location: 'Court 2' },
          
          // Week 3
          { id: 'demo_apt_17', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-16T09:00:00'), endTime: new Date('2026-02-16T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_17', clientName: 'Phoenix Moore', clientEmail: 'phoenix@example.com', location: 'Court 1' },
          { id: 'demo_apt_18', type: '2-Athlete Private', typeCategory: '2_athlete', cost: 120, startTime: new Date('2026-02-17T14:00:00'), endTime: new Date('2026-02-17T15:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_18', clientName: 'Rowan Jackson', clientEmail: 'rowan@example.com', location: 'Court 2', athleteNames: ['Rowan Jackson', 'Parker Jackson'] },
          { id: 'demo_apt_19', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-17T18:00:00'), endTime: new Date('2026-02-17T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_19', clientName: 'Finley Martin', clientEmail: 'finley@example.com', location: 'Main Court' },
          { id: 'demo_apt_20', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-18T09:00:00'), endTime: new Date('2026-02-18T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_3', trainerName: 'Coach Alex', clientId: 'demo_client_20', clientName: 'Charlie White', clientEmail: 'charlie@example.com', location: 'Court 1' },
          { id: 'demo_apt_21', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-19T10:00:00'), endTime: new Date('2026-02-19T11:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_21', clientName: 'Reese Harris', clientEmail: 'reese@example.com', location: 'Court 1' },
          { id: 'demo_apt_22', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-19T18:00:00'), endTime: new Date('2026-02-19T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_22', clientName: 'Emerson Clark', clientEmail: 'emerson@example.com', location: 'Main Court' },
          
          // Week 4
          { id: 'demo_apt_23', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-23T09:00:00'), endTime: new Date('2026-02-23T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_23', clientName: 'Lennox Lewis', clientEmail: 'lennox@example.com', location: 'Court 1' },
          { id: 'demo_apt_24', type: '2-Athlete Private', typeCategory: '2_athlete', cost: 120, startTime: new Date('2026-02-24T14:00:00'), endTime: new Date('2026-02-24T15:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_24', clientName: 'Sawyer Walker', clientEmail: 'sawyer@example.com', location: 'Court 2', athleteNames: ['Sawyer Walker', 'Sloane Walker'] },
          { id: 'demo_apt_25', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-24T18:00:00'), endTime: new Date('2026-02-24T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_25', clientName: 'Hayden Young', clientEmail: 'hayden@example.com', location: 'Main Court' },
          { id: 'demo_apt_26', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-25T09:00:00'), endTime: new Date('2026-02-25T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_3', trainerName: 'Coach Alex', clientId: 'demo_client_26', clientName: 'Rory Allen', clientEmail: 'rory@example.com', location: 'Court 1' },
          { id: 'demo_apt_27', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-26T10:00:00'), endTime: new Date('2026-02-26T11:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_27', clientName: 'Marlowe King', clientEmail: 'marlowe@example.com', location: 'Court 1' },
          { id: 'demo_apt_28', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-26T18:00:00'), endTime: new Date('2026-02-26T19:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_28', clientName: 'Bellamy Scott', clientEmail: 'bellamy@example.com', location: 'Main Court' },
          { id: 'demo_apt_29', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-27T09:00:00'), endTime: new Date('2026-02-27T10:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_29', clientName: 'Logan Green', clientEmail: 'logan@example.com', location: 'Court 1' },
          { id: 'demo_apt_30', type: '2-Athlete Private', typeCategory: '2_athlete', cost: 120, startTime: new Date('2026-02-27T14:00:00'), endTime: new Date('2026-02-27T15:00:00'), status: 'completed', duration: 60, trainerId: 'demo_trainer_3', trainerName: 'Coach Alex', clientId: 'demo_client_30', clientName: 'Bailey Adams', clientEmail: 'bailey@example.com', location: 'Court 1', athleteNames: ['Bailey Adams', 'Blake Adams'] },
          
          // Some cancelled and no-shows for realism
          { id: 'demo_apt_31', type: 'Private Lesson', typeCategory: 'private', cost: 80, startTime: new Date('2026-02-14T10:00:00'), endTime: new Date('2026-02-14T11:00:00'), status: 'cancelled', duration: 60, trainerId: 'demo_trainer_1', trainerName: 'Coach Sarah', clientId: 'demo_client_31', clientName: 'Aspen Baker', clientEmail: 'aspen@example.com', location: 'Court 1' },
          { id: 'demo_apt_32', type: 'Group Class', typeCategory: 'class', cost: 45, startTime: new Date('2026-02-21T18:00:00'), endTime: new Date('2026-02-21T19:00:00'), status: 'no-show', duration: 60, trainerId: 'demo_trainer_2', trainerName: 'Coach Mike', clientId: 'demo_client_32', clientName: 'Eden Cruz', clientEmail: 'eden@example.com', location: 'Main Court' },
        ];
        
        // Add demo appointments to loaded appointments
        loadedAppointments.push(...demoAppointments);
        console.log(`🎬 Added ${demoAppointments.length} demo appointments`);
      }
      
      setAppointments(loadedAppointments);
      generateChartData(loadedAppointments, startDate, endDate);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateChartData(appointments: Appointment[], startDate: Date, endDate: Date) {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data: ChartData[] = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAppointments = appointments.filter(apt => 
        format(apt.startTime, 'yyyy-MM-dd') === dayStr
      );
      
      return {
        date: format(day, 'MMM d'),
        scheduled: dayAppointments.filter(a => a.status === 'scheduled').length,
        completed: dayAppointments.filter(a => a.status === 'completed').length,
        cancelled: dayAppointments.filter(a => a.status === 'cancelled').length,
        'no-show': dayAppointments.filter(a => a.status === 'no-show').length,
        total: dayAppointments.length
      };
    });
    
    setChartData(data);
  }

  function applyFilters() {
    let filtered = [...appointments];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    
    if (trainerFilter !== 'all') {
      filtered = filtered.filter(a => a.trainerId === trainerFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.typeCategory === typeFilter);
    }
    
    if (clientSearch.trim()) {
      const search = clientSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.clientName.toLowerCase().includes(search) ||
        a.clientEmail.toLowerCase().includes(search)
      );
    }
    
    setFilteredAppointments(filtered);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'date':
        comparison = a.startTime.getTime() - b.startTime.getTime();
        break;
      case 'client':
        comparison = a.clientName.localeCompare(b.clientName);
        break;
      case 'trainer':
        comparison = a.trainerName.localeCompare(b.trainerName);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'duration':
        comparison = a.duration - b.duration;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  function exportToCSV() {
    // Track export feature usage
    trackFeature.export('appointments_csv', sortedAppointments.length);

    const headers = ['Date', 'Time', 'Client', 'Email', 'Trainer', 'Type', 'Duration (min)', 'Status', 'Location', 'Athletes'];
    const rows = sortedAppointments.map(apt => [
      format(apt.startTime, 'yyyy-MM-dd'),
      format(apt.startTime, 'HH:mm'),
      apt.clientName,
      apt.clientEmail,
      apt.trainerName,
      apt.type,
      apt.duration.toString(),
      apt.status,
      apt.location || '',
      apt.athleteNames?.join('; ') || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  }

  // Get unique appointment types for filter
  const uniqueTypes = Array.from(new Set(appointments.map(a => a.typeCategory)));

  // Calculate summary stats
  const totalAppointments = filteredAppointments.length;
  const scheduledCount = filteredAppointments.filter(a => a.status === 'scheduled').length;
  const completedCount = filteredAppointments.filter(a => a.status === 'completed').length;
  const cancelledCount = filteredAppointments.filter(a => a.status === 'cancelled').length;
  const noShowCount = filteredAppointments.filter(a => a.status === 'no-show').length;
  const totalHours = filteredAppointments.reduce((sum, a) => sum + a.duration, 0) / 60;
  const avgDuration = filteredAppointments.length > 0 
    ? filteredAppointments.reduce((sum, a) => sum + a.duration, 0) / filteredAppointments.length 
    : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        
        {/* Chart */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        
        {/* Table */}
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Appointments Report</h1>
          <p className="text-foreground/70 mt-1">Comprehensive appointment analytics with advanced filtering</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          aria-label="Export appointment data to CSV file"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Range Type</label>
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="month">Specific Month</option>
                <option value="next-month">Next Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {dateRangeType === 'month' && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {monthOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {dateRangeType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalAppointments}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {scheduledCount} scheduled, {completedCount} completed
            </p>
            <p className="text-sm text-muted-foreground">
              {cancelledCount} cancelled, {noShowCount} no-show
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">
              {totalAppointments > 0 
                ? ((completedCount / totalAppointments) * 100).toFixed(1)
                : '0'}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} of {totalAppointments} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-sm text-muted-foreground mt-1">
              Avg {avgDuration.toFixed(0)} min per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">
              {totalAppointments > 0 
                ? (((cancelledCount + noShowCount) / totalAppointments) * 100).toFixed(1)
                : '0'}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {cancelledCount + noShowCount} cancellations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="scheduled" fill="#3b82f6" name="Scheduled" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="cancelled" fill="#f59e0b" name="Cancelled" />
              <Bar dataKey="no-show" fill="#ef4444" name="No-show" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled Only</option>
                <option value="completed">Completed Only</option>
                <option value="cancelled">Cancelled Only</option>
                <option value="no-show">No-show Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trainer</label>
              <select
                value={trainerFilter}
                onChange={(e) => setTrainerFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Trainers</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="private">Private (1 Athlete)</option>
                <option value="2_athlete">2-Athlete Private</option>
                <option value="3_athlete">3-Athlete Private</option>
                <option value="4_athlete">4-Athlete Private</option>
                <option value="class">Group Class</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search Client</label>
              <input
                type="text"
                placeholder="Name or email..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Appointments ({sortedAppointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">
                    <button 
                      onClick={() => handleSort('date')} 
                      className="flex items-center gap-1 font-medium hover:text-primary"
                      aria-label={`Sort by date ${sortField === 'date' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                    >
                      Date/Time
                      {sortField === 'date' && <ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button 
                      onClick={() => handleSort('client')} 
                      className="flex items-center gap-1 font-medium hover:text-primary"
                      aria-label={`Sort by client name ${sortField === 'client' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                    >
                      Client
                      {sortField === 'client' && <ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button 
                      onClick={() => handleSort('trainer')} 
                      className="flex items-center gap-1 font-medium hover:text-primary"
                      aria-label={`Sort by trainer name ${sortField === 'trainer' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                    >
                      Trainer
                      {sortField === 'trainer' && <ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('type')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Type
                      {sortField === 'type' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('duration')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Duration
                      {sortField === 'duration' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 font-medium hover:text-primary">
                      Status
                      {sortField === 'status' && <ArrowUpDown className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="p-3 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                {sortedAppointments.map((apt) => (
                  <tr key={apt.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium">{format(apt.startTime, 'MMM d, yyyy')}</div>
                      <div className="text-muted-foreground text-xs">
                        {format(apt.startTime, 'h:mm a')} - {format(apt.endTime, 'h:mm a')}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{apt.clientName}</div>
                      <div className="text-muted-foreground text-xs truncate max-w-[200px]">{apt.clientEmail}</div>
                      {apt.athleteNames && apt.athleteNames.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          Athletes: {apt.athleteNames.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{apt.trainerName}</td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {apt.type}
                      </span>
                    </td>
                    <td className="p-3">{apt.duration} min</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'cancelled' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{apt.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {sortedAppointments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No appointments found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
