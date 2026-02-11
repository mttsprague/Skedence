'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Download, FileSpreadsheet, Users, FileText, DollarSign, CalendarCheck, ClipboardList, MessageSquare } from 'lucide-react';

export default function ImportExportPage() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  async function exportClients() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      setExportStatus('Exporting clients...');
      
      // Get all org members who are clients
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const userIds = orgMembersSnapshot.docs.map(doc => doc.data().userId);
      
      // Load client details in batches
      const clients: any[] = [];
      const chunkSize = 30;
      
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const usersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', chunk)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          clients.push({
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.emailAddress || data.email || '',
            phone: data.phoneNumber || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || '',
            referredBy: data.referredBy || '',
            notesForCoach: data.notesForCoach || '',
            createdAt: data.createdAt ? format(data.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
            athleteCount: Array.isArray(data.athletes) ? data.athletes.length : 0
          });
        });
      }
      
      // Create CSV
      const csv = [
        ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Emergency Contact Name', 'Emergency Contact Phone', 'Referred By', 'Notes', 'Created At', 'Athlete Count'],
        ...clients.map(c => [
          c.id,
          c.firstName,
          c.lastName,
          c.email,
          c.phone,
          c.emergencyContactName,
          c.emergencyContactNumber,
          c.referredBy,
          c.notesForCoach,
          c.createdAt,
          c.athleteCount
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      downloadCSV(csv, 'clients');
      setExportStatus('Clients exported successfully!');
      
    } catch (error) {
      console.error('Error exporting clients:', error);
      setExportStatus('Error exporting clients');
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  }

  async function exportAppointments() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      setExportStatus('Exporting appointments...');
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('orgId', '==', orgId)
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const appointments: any[] = [];
      
      for (const bookingDoc of bookingsSnapshot.docs) {
        const data = bookingDoc.data();
        
        // Get client info
        const clientId = data.clientUID || data.clientId;
        let clientName = 'Unknown';
        let clientEmail = '';
        
        if (clientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
              clientEmail = clientData.emailAddress || clientData.email || '';
            }
          } catch (err) {}
        }
        
        // Get trainer info
        let trainerName = 'Unknown';
        if (data.trainerId) {
          try {
            const trainerDoc = await getDoc(doc(db, 'trainers', data.trainerId));
            if (trainerDoc.exists()) {
              const trainerData = trainerDoc.data();
              trainerName = `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim();
            }
          } catch (err) {}
        }
        
        const athleteCount = Array.isArray(data.athletes) ? data.athletes.length : 1;
        const type = athleteCount > 1 ? `${athleteCount}-Athlete Session` : 'Private Session';
        
        appointments.push({
          id: bookingDoc.id,
          date: format(data.startTime.toDate(), 'yyyy-MM-dd'),
          time: format(data.startTime.toDate(), 'HH:mm'),
          clientName,
          clientEmail,
          trainerName,
          type,
          status: data.status || 'scheduled',
          cost: data.cost || 0,
          duration: ((data.endTime.toDate().getTime() - data.startTime.toDate().getTime()) / (1000 * 60 * 60)).toFixed(2),
          notes: data.lessonNotes || ''
        });
      }
      
      // Sort by date
      appointments.sort((a, b) => b.date.localeCompare(a.date));
      
      const csv = [
        ['ID', 'Date', 'Time', 'Client Name', 'Client Email', 'Trainer', 'Type', 'Status', 'Cost', 'Duration (hrs)', 'Notes'],
        ...appointments.map(a => [
          a.id,
          a.date,
          a.time,
          a.clientName,
          a.clientEmail,
          a.trainerName,
          a.type,
          a.status,
          a.cost,
          a.duration,
          a.notes
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      downloadCSV(csv, 'appointments');
      setExportStatus('Appointments exported successfully!');
      
    } catch (error) {
      console.error('Error exporting appointments:', error);
      setExportStatus('Error exporting appointments');
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  }

  async function exportWaivers() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      setExportStatus('Exporting waivers...');
      
      // Get all org members
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const waivers: any[] = [];
      
      for (const memberDoc of orgMembersSnapshot.docs) {
        const memberData = memberDoc.data();
        
        // Get user details
        try {
          const userDoc = await getDoc(doc(db, 'users', memberData.userId));
          if (!userDoc.exists()) continue;
          
          const userData = userDoc.data();
          
          // Get waivers for this user
          const waiverDocs = await getDocs(
            collection(db, 'users', memberData.userId, 'documents')
          );
          
          waiverDocs.docs.forEach(waiverDoc => {
            const waiverData = waiverDoc.data();
            waivers.push({
              clientName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
              clientEmail: userData.emailAddress || userData.email || '',
              documentType: waiverData.documentType || 'Waiver',
              signedDate: waiverData.signedAt ? format(waiverData.signedAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
              ipAddress: waiverData.ipAddress || '',
              signature: waiverData.signature ? 'Yes' : 'No'
            });
          });
        } catch (err) {
          console.warn('Error loading waiver for user', memberData.userId, err);
        }
      }
      
      const csv = [
        ['Client Name', 'Client Email', 'Document Type', 'Signed Date', 'IP Address', 'Has Signature'],
        ...waivers.map(w => [
          w.clientName,
          w.clientEmail,
          w.documentType,
          w.signedDate,
          w.ipAddress,
          w.signature
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      downloadCSV(csv, 'waivers');
      setExportStatus('Waivers exported successfully!');
      
    } catch (error) {
      console.error('Error exporting waivers:', error);
      setExportStatus('Error exporting waivers');
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  }

  async function exportRevenue() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      setExportStatus('Exporting revenue...');
      
      // Get all org members
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const transactions: any[] = [];
      
      for (const memberDoc of orgMembersSnapshot.docs) {
        const memberData = memberDoc.data();
        
        try {
          // Get user details
          const userDoc = await getDoc(doc(db, 'users', memberData.userId));
          if (!userDoc.exists()) continue;
          const userData = userDoc.data();
          const clientName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          const clientEmail = userData.emailAddress || userData.email || '';
          
          // Try new path first
          let packagesSnap = await getDocs(
            collection(db, 'organizations', orgId, 'users', memberData.userId, 'packages')
          );
          
          // Fall back to old path
          if (packagesSnap.empty) {
            packagesSnap = await getDocs(
              collection(db, 'users', memberData.userId, 'lessonPackages')
            );
          }
          
          packagesSnap.docs.forEach(pkgDoc => {
            const pkgData = pkgDoc.data();
            
            let purchaseDate = null;
            if (pkgData.purchaseDate) {
              purchaseDate = pkgData.purchaseDate.toDate?.() || new Date(pkgData.purchaseDate);
            } else if (pkgData.purchasedAt) {
              purchaseDate = pkgData.purchasedAt.toDate?.() || new Date(pkgData.purchasedAt);
            }
            
            transactions.push({
              date: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd HH:mm:ss') : '',
              clientName,
              clientEmail,
              packageType: pkgData.packageName || pkgData.name || 'Unknown',
              amount: pkgData.amountPaid ? (pkgData.amountPaid / 100).toFixed(2) : '0.00',
              paymentMethod: pkgData.transactionId?.startsWith('ADMIN_ADDED') ? 'Admin Added' : 'Paid',
              transactionId: pkgData.transactionId || '',
              remaining: pkgData.remainingLessons || 0,
              total: pkgData.totalLessons || 0
            });
          });
        } catch (err) {
          console.warn('Error loading packages for user', memberData.userId, err);
        }
      }
      
      // Sort by date
      transactions.sort((a, b) => b.date.localeCompare(a.date));
      
      const csv = [
        ['Date', 'Client Name', 'Client Email', 'Package Type', 'Amount', 'Payment Method', 'Transaction ID', 'Remaining Lessons', 'Total Lessons'],
        ...transactions.map(t => [
          t.date,
          t.clientName,
          t.clientEmail,
          t.packageType,
          t.amount,
          t.paymentMethod,
          t.transactionId,
          t.remaining,
          t.total
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      downloadCSV(csv, 'revenue-transactions');
      setExportStatus('Revenue exported successfully!');
      
    } catch (error) {
      console.error('Error exporting revenue:', error);
      setExportStatus('Error exporting revenue');
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  }

  async function exportIntakeForms() {
    if (!orgId) return;
    
    try {
      setLoading(true);
      setExportStatus('Exporting intake forms...');
      
      // Get all org members
      const orgMembersQuery = query(
        collection(db, 'orgMembers'),
        where('orgId', '==', orgId),
        where('role', '==', 'client')
      );
      const orgMembersSnapshot = await getDocs(orgMembersQuery);
      const intakeForms: any[] = [];
      
      for (const memberDoc of orgMembersSnapshot.docs) {
        const memberData = memberDoc.data();
        
        try {
          const userDoc = await getDoc(doc(db, 'users', memberData.userId));
          if (!userDoc.exists()) continue;
          
          const userData = userDoc.data();
          const clientName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          const clientEmail = userData.emailAddress || userData.email || '';
          
          // Check if user has athletes with intake data
          if (Array.isArray(userData.athletes)) {
            userData.athletes.forEach((athlete: any, index: number) => {
              intakeForms.push({
                clientName,
                clientEmail,
                athleteName: athlete.name || '',
                age: athlete.age || '',
                sportsFocus: athlete.sportsFocus || '',
                trainingGoals: athlete.trainingGoals || '',
                medicalConditions: athlete.medicalConditions || '',
                previousInjuries: athlete.previousInjuries || '',
                experienceLevel: athlete.experienceLevel || ''
              });
            });
          }
        } catch (err) {
          console.warn('Error loading intake forms for user', memberData.userId, err);
        }
      }
      
      const csv = [
        ['Client Name', 'Client Email', 'Athlete Name', 'Age', 'Sports Focus', 'Training Goals', 'Medical Conditions', 'Previous Injuries', 'Experience Level'],
        ...intakeForms.map(f => [
          f.clientName,
          f.clientEmail,
          f.athleteName,
          f.age,
          f.sportsFocus,
          f.trainingGoals,
          f.medicalConditions,
          f.previousInjuries,
          f.experienceLevel
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      downloadCSV(csv, 'intake-forms');
      setExportStatus('Intake forms exported successfully!');
      
    } catch (error) {
      console.error('Error exporting intake forms:', error);
      setExportStatus('Error exporting intake forms');
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  const exportOptions = [
    {
      title: 'Clients',
      description: 'Export all client information including contact details, emergency contacts, and athlete count',
      icon: Users,
      action: exportClients,
      color: 'bg-blue-500'
    },
    {
      title: 'Appointments',
      description: 'Export all scheduled appointments with client, trainer, date, time, and status information',
      icon: CalendarCheck,
      action: exportAppointments,
      color: 'bg-green-500'
    },
    {
      title: 'Revenue & Transactions',
      description: 'Export all package purchases and revenue transactions',
      icon: DollarSign,
      action: exportRevenue,
      color: 'bg-yellow-500'
    },
    {
      title: 'Waivers & Documents',
      description: 'Export all signed waivers and liability documents',
      icon: FileText,
      action: exportWaivers,
      color: 'bg-purple-500'
    },
    {
      title: 'Intake Forms',
      description: 'Export athlete intake form data including goals, medical conditions, and experience levels',
      icon: ClipboardList,
      action: exportIntakeForms,
      color: 'bg-pink-500'
    }
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Import / Export</h1>
          <p className="text-gray-600 mt-2">
            Export your data to CSV format for backup, analysis, or migration purposes.
          </p>
        </div>

        {/* Status Message */}
        {exportStatus && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-blue-900 font-medium">{exportStatus}</p>
            </CardContent>
          </Card>
        )}

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card key={option.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${option.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{option.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <button
                    onClick={option.action}
                    disabled={loading || !orgId}
                    className="w-full px-4 py-2 bg-[#3258A3] text-white rounded-md hover:bg-[#2a4a8a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {loading ? 'Exporting...' : `Export ${option.title}`}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <FileSpreadsheet className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About CSV Exports</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• All exports are in CSV (Comma-Separated Values) format</li>
                  <li>• Files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
                  <li>• Exports include all historical data from your organization</li>
                  <li>• Data is exported as of the current date and time</li>
                  <li>• Sensitive information like passwords and payment details are never included</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Import Functionality</h3>
                <p className="text-sm text-yellow-800">
                  Import functionality is not currently available. If you need to import data, please contact support for assistance with data migration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
