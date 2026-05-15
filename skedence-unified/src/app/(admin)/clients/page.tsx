'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SchedulingSubmenu } from '@/components/admin/scheduling-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ClientCardSkeleton } from '@/components/ui/skeleton';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, documentId } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { User, AthleteInfo } from '@/types';
import { Save, X, User as UserIcon, Search, Calendar, Package, FileText, CreditCard, Receipt, History, Download, Smartphone, QrCode, Key, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { logClientProfileUpdated } from '@/lib/activity-logger';
import { trackPageView } from '@/lib/analytics';
import { toast } from '@/lib/toast';

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
  displayName?: string;
  type: string;
  url: string;
  uploadedAt: Timestamp;
  uploadedBy?: string;
  signedBy?: string;
  signatoryEmail?: string;
  isMinor?: boolean;
  athleteName?: string;
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
  const { orgId, user, userData, orgData } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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
  const [inviteCode, setInviteCode] = useState<string>('');
  const [fieldLabels, setFieldLabels] = useState({ birthday: 'Birthday', schoolClubTeam: 'School / Club Team', experienceLevel: 'Experience Level', position: 'Position' });
  
  // Client invitation
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteBannerDismissed, setInviteBannerDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inviteBannerDismissed') === 'true';
    }
    return false;
  });

  const dismissInviteBanner = () => {
    setInviteBannerDismissed(true);
    localStorage.setItem('inviteBannerDismissed', 'true');
  };
  
  // Advanced Filters
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('all');
  const [passStatusFilter, setPassStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [clientBookingSummary, setClientBookingSummary] = useState<Record<string, { lastDate: number; count: number }>>({});
  const [clientSpentMap, setClientSpentMap] = useState<Record<string, number>>({});

  // Track page view
  useEffect(() => {
    trackPageView('/clients', 'Clients');
  }, []);

  // Keyboard shortcuts event listeners
  useEffect(() => {
    const handleNewClient = () => {
      setSelectedClient(null);
      setEditedClient(null);
      setActiveTab('profile');
      setSheetOpen(true);
    };

    const handleExport = () => {
      // Export clients to CSV
      const csvHeaders = ['First Name', 'Last Name', 'Email', 'Phone Number', 'Join Date', 'Total Passes', 'Active Passes'];
      const csvRows = filteredClients.map(client => {
        let joinDate = '';
        if (client.createdAt) {
          try {
            // Try Firestore Timestamp
            joinDate = new Date((client.createdAt as any).toMillis()).toLocaleDateString();
          } catch {
            // Fall back to Date
            if (client.createdAt instanceof Date) {
              joinDate = client.createdAt.toLocaleDateString();
            }
          }
        }
        
        return [
          client.firstName || '',
          client.lastName || '',
          client.email || client.emailAddress || '',
          client.phoneNumber || '',
          joinDate,
          '0', // TODO: Load actual package counts
          '0'
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Clients exported to CSV');
    };

    window.addEventListener('trigger-new-client', handleNewClient);
    window.addEventListener('trigger-export', handleExport);

    return () => {
      window.removeEventListener('trigger-new-client', handleNewClient);
      window.removeEventListener('trigger-export', handleExport);
    };
  }, [clients, searchQuery]); // Changed from filteredClients to dependencies

  // Load organization data including invite code — use cached orgData if available
  useEffect(() => {
    if (!orgId) return;

    // If org data is already cached in auth context, use it directly
    if (orgData) {
      setInviteCode(orgData.inviteCode || '');
      const fields: any[] = orgData.intakeFormFieldsPrivate || orgData.intakeFormFields || [];
      const getLabel = (id: string, def: string) => fields.find((f: any) => f.id === id)?.label || def;
      const posField = fields.find((f: any) => typeof f.label === 'string' && f.label.toLowerCase().includes('position'));
      setFieldLabels({
        birthday: getLabel('athleteBirthday', 'Birthday'),
        schoolClubTeam: getLabel('schoolTeam', 'School / Club Team'),
        experienceLevel: getLabel('experienceLevel', 'Experience Level'),
        position: posField?.label || 'Position',
      });
      return;
    }

    async function loadOrganizationData() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setInviteCode(data.inviteCode || '');
          const fields: any[] = data.intakeFormFieldsPrivate || data.intakeFormFields || [];
          const getLabel = (id: string, def: string) => fields.find((f: any) => f.id === id)?.label || def;
          const posField = fields.find((f: any) => typeof f.label === 'string' && f.label.toLowerCase().includes('position'));
          setFieldLabels({
            birthday: getLabel('athleteBirthday', 'Birthday'),
            schoolClubTeam: getLabel('schoolTeam', 'School / Club Team'),
            experienceLevel: getLabel('experienceLevel', 'Experience Level'),
            position: posField?.label || 'Position',
          });
        }
      } catch (error) {
        console.error('Error loading organization data:', error);
      }
    }

    loadOrganizationData();
  }, [orgId, orgData]);

  // Load clients — also runs on every mount to handle Next.js router cache restoration
  const loadClientsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadClients() {
      setLoading(true);
      // Don't clear clients during reload — keeps existing list visible while fetching,
      // prevents the flash of empty state and avoids race conditions with concurrent calls.
      try {
        const membersQuery = query(
          collection(db, 'orgMembers'),
          where('orgId', '==', orgId),
          where('role', '==', 'client'),
          where('isActive', '==', true)
        );
        const membersSnapshot = await getDocs(membersQuery);

        // Filter to client members only (userId must be present), deduplicate by userId
        // (a user can have multiple orgMembers docs, e.g. one from onboarding and one from re-invite)
        const seenUserIds = new Set<string>();
        const clientMembers = membersSnapshot.docs
          .map(d => d.data())
          .filter(m => {
            if (!m.userId) return false;
            if (seenUserIds.has(m.userId)) return false;
            seenUserIds.add(m.userId);
            return true;
          });

        // Batch-fetch all user docs in groups of 30 (Firestore 'in' query limit)
        const userIds = clientMembers.map(m => m.userId as string);
        const BATCH_SIZE = 30;
        const userDocsMap = new Map<string, Record<string, any>>();
        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
          const batchIds = userIds.slice(i, i + BATCH_SIZE);
          const usersSnap = await getDocs(
            query(collection(db, 'users'), where(documentId(), 'in', batchIds))
          );
          usersSnap.docs.forEach(d => userDocsMap.set(d.id, d.data()));
        }

        // Build client objects from cached user data
        const clientsData: User[] = [];
        for (const memberData of clientMembers) {
          const userData = userDocsMap.get(memberData.userId);
          if (!userData) continue;
          // Skip soft-deleted users
          if (userData.isActive === false) continue;

          // Convert legacy athlete fields to athletes array if needed
          let athletesArray: AthleteInfo[] = [];
          if (Array.isArray(userData.athletes) && userData.athletes.length > 0) {
            athletesArray = userData.athletes;
          } else {
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

          clientsData.push({
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
          } as User);
        }
        clientsData.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

        if (!cancelled) setClients(clientsData);
      } catch (error) {
        console.error('Clients: Error loading:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadClientsRef.current = loadClients;
    loadClients();

    return () => { cancelled = true; };
  }, [orgId]);

  // Re-trigger fetch on every mount (handles Next.js router-cache restoration
  // where orgId hasn't changed but component re-mounted after navigation)
  useEffect(() => {
    if (loadClientsRef.current) {
      loadClientsRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs exactly once per mount

  // Load booking & spend summaries for all clients (enables sort-by-booking and sort-by-spend)
  useEffect(() => {
    if (!orgId || clients.length === 0) return;
    let cancelled = false;
    async function loadSummaries() {
      const [bookingsSnap, transSnap] = await Promise.all([
        getDocs(query(collection(db, 'bookings'), where('orgId', '==', orgId))),
        getDocs(query(collection(db, 'transactions'), where('orgId', '==', orgId))),
      ]);
      if (cancelled) return;
      const bookMap: Record<string, { lastDate: number; count: number }> = {};
      bookingsSnap.forEach(d => {
        const data = d.data();
        const cId = data.clientUID || data.clientId;
        if (!cId) return;
        const ts = data.startTime?.seconds ?? 0;
        if (!bookMap[cId]) bookMap[cId] = { lastDate: 0, count: 0 };
        bookMap[cId].count++;
        if (ts > bookMap[cId].lastDate) bookMap[cId].lastDate = ts;
      });
      const spendMap: Record<string, number> = {};
      transSnap.forEach(d => {
        const data = d.data();
        const cId = data.userId;
        if (!cId || data.status !== 'succeeded') return;
        spendMap[cId] = (spendMap[cId] ?? 0) + (data.amount ?? 0);
      });
      setClientBookingSummary(bookMap);
      setClientSpentMap(spendMap);
    }
    loadSummaries();
    return () => { cancelled = true; };
  }, [orgId, clients.length]);

  // Load tab data when client is selected
  useEffect(() => {
    if (!orgId || !selectedClient) return;

    async function loadTabData() {
      setTabDataLoading(true);
      try {
        if (!orgId || !selectedClient) return;

        // Use the selected client's ID for most queries
        const clientId = selectedClient.id;

        // Load bookings — query both clientUID and clientId fields, plus classRegistrations fallback
        const now = new Date();
        const [bookingsSnap1, bookingsSnap2, classRegsSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookings'), where('clientUID', '==', clientId), where('orgId', '==', orgId))),
          getDocs(query(collection(db, 'bookings'), where('clientId', '==', clientId), where('orgId', '==', orgId))),
          getDocs(query(collection(db, 'classRegistrations'), where('clientId', '==', clientId), where('orgId', '==', orgId))),
        ]);
        // Merge bookings and deduplicate by doc ID
        const bookingsById = new Map<string, any>();
        [...bookingsSnap1.docs, ...bookingsSnap2.docs].forEach(d => bookingsById.set(d.id, { id: d.id, ...d.data() }));

        // For any classRegistration that has no corresponding booking, synthesize one from the class doc
        const coveredClassIds = new Set(Array.from(bookingsById.values()).filter(b => b.classId).map(b => b.classId));
        const missingClassIds = classRegsSnap.docs
          .map(d => d.data().classId as string)
          .filter(cid => cid && !coveredClassIds.has(cid));

        if (missingClassIds.length > 0) {
          const classSnaps = await Promise.all(missingClassIds.map(cid => getDoc(doc(db, 'classes', cid))));
          classSnaps.forEach(classDoc => {
            if (!classDoc.exists()) return;
            const cd = classDoc.data()!;
            const syntheticId = `classreg_${clientId}_${classDoc.id}`;
            bookingsById.set(syntheticId, {
              id: syntheticId,
              clientUID: clientId,
              classId: classDoc.id,
              isClassBooking: true,
              status: 'booked',
              startTime: cd.startTime,
              endTime: cd.endTime,
              trainerId: cd.trainerId || '',
              trainerName: cd.trainerName || '',
              location: cd.location || '',
              orgId: orgId,
            });
          });
        }

        const bookingsSnap = { docs: Array.from(bookingsById.values()) };
        // Filter cancelled bookings client-side
        const bookingsData = bookingsSnap.docs
          .filter(doc => (doc as any).status !== 'cancelled' || (doc as any).startTime?.toDate() < now)
          .map(doc => doc as unknown as Booking);

        setUpcomingBookings(
          bookingsData
            .filter(b => b.startTime?.toDate() >= now && b.status !== 'cancelled')
            .sort((a, b) => a.startTime.seconds - b.startTime.seconds)
        );

        setPastBookings(
          bookingsData
            .filter(b => !b.startTime || b.startTime.toDate() < now || b.status === 'cancelled')
            .sort((a, b) => b.startTime.seconds - a.startTime.seconds)
        );

        // Load packages (use client ID) - try new path first
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

        // DOCUMENTS: Try firstName_lastName path FIRST, then authUserId as fallback
        let docsSnap = await getDocs(
          collection(db, 'users', clientId, 'documents')
        );
        
        // If no documents found, try the OLD path (authUserId) for backwards compatibility
        if (docsSnap.docs.length === 0) {
          const userDocRef = doc(db, 'users', clientId);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.authUserId) {
              docsSnap = await getDocs(
                collection(db, 'users', userData.authUserId, 'documents')
              );
            }
          }
        }
        
        const docsData = docsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Document[];
        
        // Sort by uploadedAt (newest first)
        const sortedDocs = docsData.sort((a, b) => 
          b.uploadedAt?.seconds - a.uploadedAt?.seconds
        );
        setDocuments(sortedDocs);

        // Load pricing packages to check if they're active
        const pricingSnap = await getDocs(
          collection(db, 'organizations', orgId, 'pricingPackages')
        );
        const pricingData = pricingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PricingPackage[];
        setPricingPackages(pricingData);

        // Load payment methods (use client ID)
        const paymentsSnap = await getDocs(
          collection(db, 'users', clientId, 'paymentMethods')
        );
        const paymentsData = paymentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PaymentMethod[];
        setPaymentMethods(paymentsData);

        // Load receipts/transactions (use client ID)
        const receiptsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', clientId),
          where('orgId', '==', orgId)
        );
        const receiptsSnap = await getDocs(receiptsQuery);
        const receiptsData = receiptsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
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

  // Extract all unique athlete positions across all clients
  const uniquePositions = useMemo(() => {
    const positions = new Set<string>();
    clients.forEach(client => {
      [
        ...(client.athletes || []).map(a => a.position),
        client.athletePosition,
        client.athlete2Position,
        client.athlete3Position,
      ].forEach(p => { if (p) positions.add(p); });
    });
    return Array.from(positions).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    const toMs = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (ts instanceof Date) return ts.getTime();
      return 0;
    };

    const primaryBirthday = (client: User): number => {
      const raw = client.athletes?.[0]?.birthday || client.athleteBirthday;
      if (!raw) return NaN;
      const t = new Date(raw).getTime();
      return isNaN(t) ? NaN : t;
    };

    // Deduplicate by id as safety net (guards against multiple orgMembers docs for same user)
    const seenIds = new Set<string>();
    const uniqueClients = clients.filter(c => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    return uniqueClients.filter(client => {
      if (!client.isActive) return false;

      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        const email = (client.email || client.emailAddress || '').toLowerCase();
        const athleteNames = [
          ...(client.athletes || []).map(a => `${a.firstName || ''} ${a.lastName || ''}`.trim()),
          `${client.athleteFirstName || ''} ${client.athleteLastName || ''}`.trim(),
          `${client.athlete2FirstName || ''} ${client.athlete2LastName || ''}`.trim(),
          `${client.athlete3FirstName || ''} ${client.athlete3LastName || ''}`.trim(),
        ].filter(Boolean).map(n => n.toLowerCase());
        const schools = [
          ...(client.athletes || []).map(a => a.schoolClubTeam || ''),
        ].filter(Boolean).map(s => s.toLowerCase());
        const matchesAthlete = athleteNames.some(n => n.includes(search));
        const matchesSchool = schools.some(s => s.includes(search));
        if (!fullName.includes(search) && !email.includes(search) && !matchesAthlete && !matchesSchool) return false;
      }

      if (positionFilter !== 'all') {
        const allPositions = [
          ...(client.athletes || []).map(a => a.position),
          client.athletePosition,
          client.athlete2Position,
          client.athlete3Position,
        ].filter(Boolean).map(p => p!.toLowerCase());
        if (!allPositions.includes(positionFilter.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
        case 'name': {
          const la = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase();
          const lb = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase();
          return la.localeCompare(lb);
        }
        case 'name-desc': {
          const la = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase();
          const lb = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase();
          return lb.localeCompare(la);
        }
        case 'joined-newest':
        case 'joined':
          return toMs(b.createdAt) - toMs(a.createdAt);
        case 'joined-oldest': {
          const ta = toMs(a.createdAt); const tb = toMs(b.createdAt);
          if (ta === 0 && tb === 0) return 0;
          if (ta === 0) return 1;  // no join date → push to end
          if (tb === 0) return -1;
          return ta - tb;
        }
        case 'age-youngest': {
          const ba = primaryBirthday(a); const bb = primaryBirthday(b);
          if (isNaN(ba) && isNaN(bb)) return 0;
          if (isNaN(ba)) return 1; if (isNaN(bb)) return -1;
          return bb - ba; // younger (more recent birthday) first
        }
        case 'age-oldest': {
          const ba = primaryBirthday(a); const bb = primaryBirthday(b);
          if (isNaN(ba) && isNaN(bb)) return 0;
          if (isNaN(ba)) return 1; if (isNaN(bb)) return -1;
          return ba - bb; // older (earlier birthday) first
        }
        case 'booking-recent': {
          const la = clientBookingSummary[a.id]?.lastDate ?? 0;
          const lb = clientBookingSummary[b.id]?.lastDate ?? 0;
          return lb - la;
        }
        case 'booking-count': {
          const ca = clientBookingSummary[a.id]?.count ?? 0;
          const cb = clientBookingSummary[b.id]?.count ?? 0;
          return cb - ca;
        }
        case 'spent-most': {
          const sa = clientSpentMap[a.id] ?? 0;
          const sb = clientSpentMap[b.id] ?? 0;
          return sb - sa;
        }
        default:
          return 0;
      }
    });
  }, [clients, searchQuery, sortBy, positionFilter, clientBookingSummary, clientSpentMap]);

  const handleClientSelect = useCallback((client: User) => {
    setSelectedClient(client);
    setEditedClient(JSON.parse(JSON.stringify(client)));
    setActiveTab('profile');
    setSheetOpen(true);
  }, []);

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
      
      toast.success('Client profile updated successfully!');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client profile', 'Please try again');
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

  const handleSendInvite = async () => {
    if (!inviteEmail || !orgId) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Invalid email address', 'Please enter a valid email');
      return;
    }
    
    setSendingInvite(true);
    try {
      // Call Cloud Function to send invitation
      const functions = getFunctions();
      const sendClientInvitation = httpsCallable(functions, 'sendClientInvitation');
      
      const result = await sendClientInvitation({
        email: inviteEmail,
        orgId: orgId,
      });
      
      toast.success('Invitation sent!', `Check ${inviteEmail} for download instructions`);
      setInviteEmail(''); // Clear the input
    } catch (error) {
      console.error('Error sending invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast.error('Failed to send invitation', errorMessage);
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <SchedulingSubmenu>
        <div className="p-6 lg:p-8">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
              <div className="h-9 w-32 bg-muted animate-pulse rounded" />
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            </div>
            
            {/* Search and filter skeleton */}
            <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
            
            {/* Client cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
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

        {/* Client Invitation Instructions */}
        {!inviteBannerDismissed && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" />
                      How to Invite Clients
                    </h3>
                  <p className="text-sm text-foreground/80">
                    Your clients can download the Skedence app and connect to your business in three easy steps:
                  </p>
                  </div>
                  <button
                    onClick={dismissInviteBanner}
                    className="flex-shrink-0 p-1.5 rounded-md text-foreground/40 hover:text-foreground/70 hover:bg-black/5 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Download the Skedence app</p>
                      <p className="text-foreground/70 mt-0.5">Available on the iOS App Store</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Create their account</p>
                      <p className="text-foreground/70 mt-0.5">Sign up with their email address</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Enter your organization code</p>
                      <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-primary" />
                          <span className="text-xs text-foreground/70">Organization Code:</span>
                        </div>
                        <code className="block px-3 py-2 bg-primary/10 rounded text-primary font-mono font-bold text-lg">
                          {inviteCode || 'Loading...'}
                        </code>
                      </div>
                      <p className="text-foreground/70 mt-2">They enter this code during signup to connect to your business</p>
                    </div>
                  </li>
                </ol>

                {/* Direct Email Invitation */}
                <div className="pt-3 mt-4 border-t border-primary/20">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Or send a direct invitation
                    </h4>
                    <p className="text-xs text-foreground/70">
                      Enter a client's email to send them a download link with your org code pre-filled
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !sendingInvite) {
                          handleSendInvite();
                        }
                      }}
                      disabled={sendingInvite}
                      className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={!inviteEmail || sendingInvite}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {sendingInvite ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Invite
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code Download */}
                <div className="pt-3 mt-4 border-t border-primary/20">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-primary" />
                      Download QR Code for Your Website
                    </h4>
                    <p className="text-xs text-foreground/70">
                      Generate a QR code that clients can scan to download the app with your organization code pre-filled
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`skedence://join?orgCode=${inviteCode}`)}`}
                      download={`skedence-qr-code-${inviteCode}.png`}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium text-center flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code (PNG)
                    </a>
                    <button
                      onClick={() => {
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`skedence://join?orgCode=${inviteCode}`)}`;
                        window.open(qrUrl, '_blank');
                      }}
                      className="flex-1 px-4 py-2 bg-secondary text-foreground border border-input rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <QrCode className="h-4 w-4" />
                      View QR Code
                    </button>
                  </div>
                  <p className="text-xs text-foreground/60 mt-2">
                    💡 Tip: Add this QR code to your website, flyers, or gym entrance for easy client signup
                  </p>
                </div>

                <div className="pt-2 pb-1 flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Clients can book 24/7 from their phone</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" />
                    <span>Your code: {inviteCode}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search + Filter Button Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search clients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent touch-manipulation text-base"
                aria-label="Search clients"
              />
            </div>
            {/* Sort & Filter Toggle Button */}
            {(() => {
              const activeCount = (sortBy !== 'name-asc' ? 1 : 0) + (positionFilter !== 'all' ? 1 : 0);
              return (
                <button
                  onClick={() => setShowFilterPanel(p => !p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap touch-manipulation ${
                    showFilterPanel || activeCount > 0
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                  aria-expanded={showFilterPanel}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Sort &amp; Filter</span>
                  {activeCount > 0 && (
                    <span className={`ml-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      showFilterPanel ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}>{activeCount}</span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                </button>
              );
            })()}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilterPanel && (
            <div className="rounded-xl border border-input bg-muted/30 p-4 space-y-4">
              {/* Sort By */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort By</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'name-asc', label: 'Name A→Z' },
                    { value: 'name-desc', label: 'Name Z→A' },
                    { value: 'joined-newest', label: 'Joined (Newest)' },
                    { value: 'joined-oldest', label: 'Joined (Oldest)' },
                    { value: 'age-youngest', label: 'Age (Youngest)' },
                    { value: 'age-oldest', label: 'Age (Oldest)' },
                    { value: 'booking-recent', label: 'Most Recent Booking' },
                    { value: 'booking-count', label: 'Most Bookings' },
                    { value: 'spent-most', label: 'Most Spent' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors touch-manipulation ${
                        sortBy === opt.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Filter */}
              {uniquePositions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Athlete Position</p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', ...uniquePositions] as string[]).map(pos => (
                      <button
                        key={pos}
                        onClick={() => setPositionFilter(pos)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors touch-manipulation ${
                          positionFilter === pos
                            ? 'bg-primary text-white border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        {pos === 'all' ? 'All Positions' : pos}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              {(sortBy !== 'name-asc' || positionFilter !== 'all') && (
                <div className="pt-1 border-t border-border">
                  <button
                    onClick={() => { setSortBy('name-asc'); setPositionFilter('all'); }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>
          )}
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
                onClick={() => handleClientSelect(client)}
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-base sm:text-lg">
                        {(client.firstName?.[0] || '') + (client.lastName?.[0] || '')}
                      </span>
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-xs sm:text-sm text-foreground/80 truncate break-all">{client.email || client.emailAddress}</p>
                      {client.phone && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{client.phone}</p>
                      )}
                      {(client.athletes && client.athletes.length > 0) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {client.athletes.length} {client.athletes.length === 1 ? 'athlete' : 'athletes'}
                        </p>
                      )}
                      {client.createdAt && (() => {
                        try {
                          const d = (client.createdAt as any).toMillis
                            ? new Date((client.createdAt as any).toMillis())
                            : new Date(client.createdAt as any);
                          return (
                            <p className="text-xs text-muted-foreground mt-1">
                              Joined {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          );
                        } catch { return null; }
                      })()}
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

      {/* Client Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          {selectedClient && (
            <div className="flex flex-col h-full">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white z-10 border-b">
                <SheetHeader className="p-4 sm:p-6 pb-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg sm:text-xl">
                        {(selectedClient.firstName?.[0] || '') + (selectedClient.lastName?.[0] || '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <SheetTitle className="text-xl sm:text-2xl font-bold text-foreground break-words">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </SheetTitle>
                      <p className="text-xs sm:text-sm text-foreground/80 break-all">{selectedClient.email || selectedClient.emailAddress}</p>
                      {selectedClient.phone && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{selectedClient.phone}</p>
                      )}
                    </div>
                  </div>
                </SheetHeader>

                {/* Tabs */}
                <div className="border-t border-gray-200 px-2">
                  <nav className="flex gap-1 overflow-x-auto p-2">
                    {[
                      { id: 'profile' as TabType, label: 'Profile', icon: UserIcon },
                      { id: 'upcoming' as TabType, label: 'Upcoming', icon: Calendar, count: upcomingBookings.length },
                      { id: 'history' as TabType, label: 'History', icon: History, count: pastBookings.length },
                      { id: 'passes' as TabType, label: 'Passes', icon: Package, count: packages.filter(p => p.remainingLessons > 0).length },
                      { id: 'documents' as TabType, label: 'Documents', icon: FileText, count: documents.length },
                      { id: 'payments' as TabType, label: 'Payments', icon: CreditCard, count: paymentMethods.length },
                      { id: 'receipts' as TabType, label: 'Receipts', icon: Receipt, count: receipts.length },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ${
                            activeTab === tab.id
                              ? 'bg-primary text-white'
                              : 'text-foreground/80 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                          {tab.count !== undefined && (
                            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                              activeTab === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200 text-foreground'
                            }`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {tabDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'profile' && (
                      <div className="p-6 space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-primary">{upcomingBookings.length}</div>
                              <div className="text-sm text-foreground/80">Upcoming</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-green-600">{packages.filter(p => p.remainingLessons > 0).length}</div>
                              <div className="text-sm text-foreground/80">Active Passes</div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Contact Info */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-foreground/80">Email</p>
                                <p className="font-medium text-sm break-all">{selectedClient.email || selectedClient.emailAddress}</p>
                              </div>
                              <div>
                                <p className="text-sm text-foreground/80">Phone</p>
                                <p className="font-medium text-sm">{selectedClient.phone || selectedClient.phoneNumber || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-foreground/80">Emergency Contact</p>
                                <p className="font-medium text-sm">{selectedClient.emergencyContactName || 'Not provided'}</p>
                                {selectedClient.emergencyContactNumber && (
                                  <p className="text-sm text-muted-foreground">{selectedClient.emergencyContactNumber}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-foreground/80">Referred By</p>
                                <p className="font-medium text-sm">{selectedClient.referredBy || 'Not provided'}</p>
                              </div>
                            </div>
                            {selectedClient.notesForCoach && (
                              <div>
                                <p className="text-sm text-foreground/80">Notes for Coach</p>
                                <p className="font-medium">{selectedClient.notesForCoach}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Athletes */}
                        {selectedClient.athletes && selectedClient.athletes.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Athletes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {selectedClient.athletes.map((athlete, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                  <p className="font-semibold">{athlete.firstName} {athlete.lastName}</p>
                                  {athlete.birthday && <p className="text-sm text-muted-foreground">{fieldLabels.birthday}: {athlete.birthday}</p>}
                                  {athlete.schoolClubTeam && <p className="text-sm text-muted-foreground">{fieldLabels.schoolClubTeam}: {athlete.schoolClubTeam}</p>}
                                  {athlete.experienceLevel && <p className="text-sm text-muted-foreground">{fieldLabels.experienceLevel}: {athlete.experienceLevel}</p>}
                                  {athlete.position && <p className="text-sm text-muted-foreground">{fieldLabels.position}: {athlete.position}</p>}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {activeTab === 'upcoming' && (
                      <div className="p-6">
                        {upcomingBookings.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No upcoming sessions</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {upcomingBookings.map((booking) => (
                              <Card key={booking.id}>
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <p className="font-semibold">{booking.startTime.toDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                      <p className="text-sm text-foreground/80">
                                        {booking.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </p>
                                      <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                                      {booking.athleteNames && booking.athleteNames.length > 0 && (
                                        <p className="text-xs text-muted-foreground">Athletes: {booking.athleteNames.join(', ')}</p>
                                      )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      booking.status === 'booked' ? 'bg-green-100 text-green-700' :
                                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-foreground'
                                    }`}>
                                      {booking.status}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="p-6">
                        {pastBookings.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
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
                                      <p className="font-semibold">{booking.startTime.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                      <p className="text-sm text-foreground/80">
                                        {booking.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {booking.endTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </p>
                                      <p className="text-sm text-foreground/80">with {booking.trainerName}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'passes' && (
                      <div className="p-6">
                        {packages.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No passes purchased</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {packages.filter(p => p.remainingLessons > 0).length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Active Passes</h3>
                                <div className="space-y-3">
                                  {packages.filter(p => p.remainingLessons > 0).map((pkg) => (
                                    <Card key={pkg.id}>
                                      <CardContent className="pt-6">
                                        <div className="flex items-start justify-between mb-2">
                                          <h4 className="font-semibold">{pkg.packageName || pkg.packageType}</h4>
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                                        </div>
                                        <p className="text-sm text-foreground/80">
                                          <span className="font-medium text-primary">{pkg.remainingLessons}</span> of {pkg.totalLessons} sessions remaining
                                        </p>
                                        <p className="text-sm text-foreground/80">Expires: {pkg.expirationDate?.toDate?.()?.toLocaleDateString()}</p>
                                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                          <span>Purchased {pkg.purchaseDate?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                          {pkg.amountPaid != null && pkg.amountPaid > 0 && (
                                            <span className="font-medium text-foreground">${(pkg.amountPaid / 100).toFixed(2)}</span>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            {packages.filter(p => p.remainingLessons === 0).length > 0 && (
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Used Passes</h3>
                                <div className="space-y-3">
                                  {packages.filter(p => p.remainingLessons === 0).map((pkg) => (
                                    <Card key={pkg.id} className="opacity-60">
                                      <CardContent className="pt-6">
                                        <h4 className="font-semibold mb-2">{pkg.packageName || pkg.packageType}</h4>
                                        <p className="text-sm text-foreground/80">{pkg.lessonsUsed} of {pkg.totalLessons} sessions used</p>
                                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                          <span>Purchased {pkg.purchaseDate?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                          {pkg.amountPaid != null && pkg.amountPaid > 0 && (
                                            <span className="font-medium text-foreground">${(pkg.amountPaid / 100).toFixed(2)}</span>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Transaction History */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
                              <div className="rounded-lg border border-border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Package</th>
                                      <th className="text-center px-4 py-2 font-medium text-muted-foreground">Sessions</th>
                                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {[...packages]
                                      .sort((a, b) => (b.purchaseDate?.seconds ?? 0) - (a.purchaseDate?.seconds ?? 0))
                                      .map((pkg) => (
                                        <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {pkg.purchaseDate?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? '—'}
                                          </td>
                                          <td className="px-4 py-3 font-medium">
                                            {pkg.packageName || pkg.packageType}
                                          </td>
                                          <td className="px-4 py-3 text-center text-muted-foreground">
                                            {pkg.totalLessons}
                                          </td>
                                          <td className="px-4 py-3 text-right font-medium">
                                            {pkg.amountPaid != null && pkg.amountPaid > 0
                                              ? `$${(pkg.amountPaid / 100).toFixed(2)}`
                                              : '—'}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            {pkg.remainingLessons > 0 ? (
                                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                                            ) : (
                                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Used</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                              {packages.filter(p => p.amountPaid != null && p.amountPaid > 0).length > 0 && (
                                <div className="mt-3 flex justify-end text-sm">
                                  <span className="text-muted-foreground mr-2">Total spent:</span>
                                  <span className="font-semibold">
                                    ${(packages.reduce((sum, p) => sum + (p.amountPaid ?? 0), 0) / 100).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'documents' && (
                      <div className="p-6">
                        {documents.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No documents or waivers</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.map((doc) => {
                              const isWaiver = doc.type === 'waiver';
                              const displayName = doc.displayName || doc.name;
                              const athleteLabel = doc.athleteName ? ` - ${doc.athleteName}` : '';
                              return (
                                <Card key={doc.id}>
                                  <CardContent className="pt-6">
                                    <div className="flex items-start gap-3 mb-3">
                                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="font-medium truncate">{displayName}{athleteLabel}</p>
                                          {isWaiver && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex-shrink-0">Waiver</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {doc.uploadedAt.toDate().toLocaleDateString()}
                                        </p>
                                        {isWaiver && doc.signedBy && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Signed by: {doc.signedBy}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
                                      View PDF
                                    </a>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'payments' && (
                      <div className="p-6">
                        {paymentMethods.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
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
                                        <p className="font-medium">{method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}</p>
                                        <p className="text-sm text-foreground/80">Expires {method.expMonth || method.expiryMonth}/{method.expYear || method.expiryYear}</p>
                                      </div>
                                    </div>
                                    {method.isDefault && (
                                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Default</span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'receipts' && (
                      <div className="p-6">
                        {receipts.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground">
                            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No receipts</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {receipts.map((receipt) => (
                              <Card key={receipt.id}>
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-semibold">{receipt.description || receipt.packageName || 'Purchase'}</p>
                                      <p className="text-sm text-foreground/80 mt-1">
                                        {receipt.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-primary">${((receipt.amount || 0) / 100).toFixed(2)}</p>
                                      <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${
                                        receipt.status === 'succeeded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-foreground'
                                      }`}>
                                        {receipt.status}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SchedulingSubmenu>
  );
}
