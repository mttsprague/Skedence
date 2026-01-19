// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCed2hTvqoE5UUe5ezom6mmWlNvzxmPdd8",
    authDomain: "polyface-ae6d3.firebaseapp.com",
    projectId: "polyface-ae6d3",
    storageBucket: "polyface-ae6d3.firebasestorage.app",
    messagingSenderId: "12415846104",
    appId: "1:12415846104:web:30bb35d5ba3c0c28e5c73f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global state
let currentUser = null;
let currentOrgId = null;
let currentBookingFilter = 'all';
let allData = {
    clients: [],
    trainers: [],
    bookings: [],
    packages: []
};

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserOrganization();
        showDashboard();
        await loadAllData();
    } else {
        showLogin();
    }
});

// Login handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        errorDiv.classList.add('hidden');
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
});

// Logout handler
async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Load user's organization
async function loadUserOrganization() {
    try {
        // Find the user's organization membership
        const orgMembersSnapshot = await db.collection('orgMembers')
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();
        
        if (!orgMembersSnapshot.empty) {
            const memberDoc = orgMembersSnapshot.docs[0];
            currentOrgId = memberDoc.data().orgId;
            
            // Load organization details
            const orgDoc = await db.collection('organizations').doc(currentOrgId).get();
            if (orgDoc.exists) {
                const orgData = orgDoc.data();
                document.getElementById('orgName').textContent = orgData.name || 'Organization';
            }
        } else {
            console.error('User is not a member of any organization');
        }
    } catch (error) {
        console.error('Error loading organization:', error);
    }
}

// Show/hide screens
function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('dashboardScreen').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.remove('hidden');
    }
    
    // Add active class to clicked menu item
    event.target.closest('.sidebar-item').classList.add('active');
}

// Load all data
async function loadAllData() {
    if (!currentOrgId) return;
    
    try {
        await Promise.all([
            loadClients(),
            loadTrainers(),
            loadBookings(),
            loadPackages()
        ]);
        
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load clients
async function loadClients() {
    try {
        const membersSnapshot = await db.collection('orgMembers')
            .where('orgId', '==', currentOrgId)
            .get();
        
        const clientPromises = membersSnapshot.docs.map(async (doc) => {
            const memberData = doc.data();
            const userDoc = await db.collection('users').doc(memberData.userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const firstName = userData.firstName || '';
                const lastName = userData.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim() || userData.name || 'N/A';
                return {
                    id: memberData.userId,
                    name: fullName,
                    email: userData.emailAddress || userData.email || 'N/A',
                    phone: userData.phoneNumber || 'N/A',
                    role: memberData.role || 'client',
                    joinedAt: memberData.joinedAt ? new Date(memberData.joinedAt.toMillis()) : null,
                    isActive: userData.isActive !== false
                };
            }
            return null;
        });
        
        allData.clients = (await Promise.all(clientPromises)).filter(c => c !== null);
        renderClients();
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

// Render clients
function renderClients() {
    const container = document.getElementById('clientsList');
    
    if (allData.clients.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>No Clients</h3><p>No clients found in your organization.</p></div>';
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                </tr>
            </thead>
            <tbody>
                ${allData.clients.map(client => `
                    <tr>
                        <td><strong>${client.name}</strong></td>
                        <td>${client.email}</td>
                        <td>${client.phone}</td>
                        <td><span class="badge badge-primary">${client.role}</span></td>
                        <td><span class="badge ${client.isActive ? 'badge-success' : 'badge-danger'}">${client.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>${client.joinedAt ? client.joinedAt.toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Load trainers
async function loadTrainers() {
    try {
        const trainersSnapshot = await db.collection('trainers')
            .where('orgId', '==', currentOrgId)
            .get();
        
        allData.trainers = trainersSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Trainer data:', doc.id, data);
            const firstName = data.firstName || '';
            const lastName = data.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || data.name || 'N/A';
            return {
                id: doc.id,
                name: fullName,
                email: data.email || data.emailAddress || 'N/A',
                specialties: data.specialties || [],
                isActive: data.isActive !== false,
                bio: data.bio || ''
            };
        });
        
        renderTrainers();
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

// Render trainers
function renderTrainers() {
    const container = document.getElementById('trainersList');
    
    if (allData.trainers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><h3>No Trainers</h3><p>No trainers found in your organization.</p></div>';
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Specialties</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${allData.trainers.map(trainer => `
                    <tr>
                        <td><strong>${trainer.name}</strong></td>
                        <td>${trainer.email}</td>
                        <td>${trainer.specialties.join(', ') || 'None'}</td>
                        <td><span class="badge ${trainer.isActive ? 'badge-success' : 'badge-danger'}">${trainer.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Load bookings
async function loadBookings() {
    try {
        console.log('Loading bookings for org:', currentOrgId);
        
        // Try different query approaches
        let bookingsSnapshot;
        try {
            // First try with orgId and orderBy
            bookingsSnapshot = await db.collection('bookings')
                .where('orgId', '==', currentOrgId)
                .orderBy('scheduledTime', 'desc')
                .limit(100)
                .get();
        } catch (indexError) {
            console.log('Index not available, trying simpler query:', indexError);
            // If that fails, just query by orgId without ordering
            bookingsSnapshot = await db.collection('bookings')
                .where('orgId', '==', currentOrgId)
                .limit(100)
                .get();
        }
        
        console.log('Found bookings:', bookingsSnapshot.size);
        
        const bookingPromises = bookingsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Get client name
            let clientName = 'Unknown';
            try {
                const userDoc = await db.collection('users').doc(data.clientId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log('Client data for booking:', data.clientId, userData);
                    const firstName = userData.firstName || '';
                    const lastName = userData.lastName || '';
                    clientName = `${firstName} ${lastName}`.trim() || userData.name || 'Unknown';
                }
            } catch (err) {
                console.error('Error fetching client:', err);
            }
            
            // Get trainer name
            let trainerName = 'Unknown';
            try {
                const trainerDoc = await db.collection('trainers').doc(data.trainerId).get();
                if (trainerDoc.exists) {
                    const trainerData = trainerDoc.data();
                    console.log('Trainer data for booking:', data.trainerId, trainerData);
                    const firstName = trainerData.firstName || '';
                    const lastName = trainerData.lastName || '';
                    trainerName = `${firstName} ${lastName}`.trim() || trainerData.name || 'Unknown';
                }
            } catch (err) {
                console.error('Error fetching trainer:', err);
            }
            
            return {
                id: doc.id,
                clientName,
                trainerName,
                scheduledTime: data.scheduledTime ? new Date(data.scheduledTime.toMillis()) : null,
                status: getBookingStatus(data, new Date(data.scheduledTime ? data.scheduledTime.toMillis() : Date.now())),
                duration: data.duration || 60,
                notes: data.notes || ''
            };
        });
        
        allData.bookings = await Promise.all(bookingPromises);
        
        // Sort bookings by scheduled time (newest first)
        allData.bookings.sort((a, b) => {
            if (!a.scheduledTime) return 1;
            if (!b.scheduledTime) return -1;
            return b.scheduledTime - a.scheduledTime;
        });
        
        console.log('Loaded bookings:', allData.bookings.length);
        renderBookings();
        renderRecentBookings();
    } catch (error) {
        console.error('Error loading bookings:', error);
        // Show error in UI
        const recentContainer = document.getElementById('recentBookings');
        if (recentContainer) {
            recentContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error Loading Bookings</h3><p>' + error.message + '</p></div>';
        }
    }
}

// Render bookings
function renderBookings() {
    const container = document.getElementById('bookingsList');
    
    if (allData.bookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No Bookings</h3><p>No bookings found.</p></div>';
        return;
    }
    
    // Filter bookings based on current filter
    let filteredBookings = allData.bookings;
    const now = new Date();
    
    if (currentBookingFilter === 'upcoming') {
        filteredBookings = allData.bookings.filter(b => b.scheduledTime && b.scheduledTime > now);
    } else if (currentBookingFilter === 'past') {
        filteredBookings = allData.bookings.filter(b => b.scheduledTime && b.scheduledTime <= now);
    }
    
    if (filteredBookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No Bookings</h3><p>No bookings found for this filter.</p></div>';
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Trainer</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${filteredBookings.map(booking => `
                    <tr>
                        <td><strong>${booking.clientName}</strong></td>
                        <td>${booking.trainerName}</td>
                        <td>${booking.scheduledTime ? booking.scheduledTime.toLocaleString() : 'N/A'}</td>
                        <td>${booking.duration} min</td>
                        <td><span class="badge ${getStatusBadge(booking.status)}">${booking.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Render recent bookings (for overview)
function renderRecentBookings() {
    const container = document.getElementById('recentBookings');
    const recentBookings = allData.bookings.slice(0, 5);
    
    if (recentBookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No Recent Bookings</h3></div>';
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Trainer</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${recentBookings.map(booking => `
                    <tr>
                        <td><strong>${booking.clientName}</strong></td>
                        <td>${booking.trainerName}</td>
                        <td>${booking.scheduledTime ? booking.scheduledTime.toLocaleString() : 'N/A'}</td>
                        <td><span class="badge ${getStatusBadge(booking.status)}">${booking.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Load packages
async function loadPackages() {
    try {
        // Get all users in the organization
        const membersSnapshot = await db.collection('orgMembers')
            .where('orgId', '==', currentOrgId)
            .get();
        
        const packagePromises = membersSnapshot.docs.map(async (memberDoc) => {
            const userId = memberDoc.data().userId;
            
            // Get packages for this user
            const packagesSnapshot = await db.collection('users')
                .doc(userId)
                .collection('lessonPackages')
                .get();
            
            const userPackages = [];
            for (const pkgDoc of packagesSnapshot.docs) {
                const pkgData = pkgDoc.data();
                
                // Get user name
                let userName = 'Unknown';
                try {
                    const userDoc = await db.collection('users').doc(userId).get();
                    if (userDoc.exists) {
                        userName = userDoc.data().name || 'Unknown';
                    }
                } catch (err) {
                    console.error('Error fetching user:', err);
                }
                
                userPackages.push({
                    id: pkgDoc.id,
                    userId,
                    userName,
                    type: pkgData.packageType || 'Unknown',
                    total: pkgData.totalLessons || 0,
                    remaining: pkgData.remainingLessons || 0,
                    purchaseDate: pkgData.purchaseDate ? new Date(pkgData.purchaseDate.toMillis()) : null,
                    expiryDate: pkgData.expiryDate ? new Date(pkgData.expiryDate.toMillis()) : null
                });
            }
            
            return userPackages;
        });
        
        const allPackages = await Promise.all(packagePromises);
        allData.packages = allPackages.flat();
        renderPackages();
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

// Render packages
function renderPackages() {
    const container = document.getElementById('packagesList');
    
    if (allData.packages.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎫</div><h3>No Packages</h3><p>No lesson packages found.</p></div>';
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Package Type</th>
                    <th>Total Lessons</th>
                    <th>Remaining</th>
                    <th>Purchase Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${allData.packages.map(pkg => `
                    <tr>
                        <td><strong>${pkg.userName}</strong></td>
                        <td>${pkg.type}</td>
                        <td>${pkg.total}</td>
                        <td><strong>${pkg.remaining}</strong></td>
                        <td>${pkg.purchaseDate ? pkg.purchaseDate.toLocaleDateString() : 'N/A'}</td>
                        <td><span class="badge ${getPackageStatusBadge(pkg)}">${getPackageStatus(pkg)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Update stats
function updateStats() {
    document.getElementById('statClients').textContent = allData.clients.length;
    document.getElementById('statTrainers').textContent = allData.trainers.filter(t => t.isActive).length;
    
    // Count bookings this month
    const now = new Date();
    const thisMonth = allData.bookings.filter(b => {
        if (!b.scheduledTime) return false;
        return b.scheduledTime.getMonth() === now.getMonth() && 
               b.scheduledTime.getFullYear() === now.getFullYear();
    });
    document.getElementById('statBookings').textContent = thisMonth.length;
    
    // Count active packages (with remaining lessons)
    const activePackages = allData.packages.filter(p => p.remaining > 0);
    document.getElementById('statPackages').textContent = activePackages.length;
}

// Helper functions
function getBookingStatus(bookingData, scheduledTime) {
    const status = bookingData.status || 'scheduled';
    const now = new Date();
    const duration = bookingData.duration || 60;
    const endTime = new Date(scheduledTime.getTime() + duration * 60000);
    
    // If booking has already ended and is not cancelled, mark as complete
    if (endTime < now && status !== 'cancelled') {
        return 'complete';
    }
    
    return status;
}

function getStatusBadge(status) {
    switch (status) {
        case 'scheduled':
        case 'confirmed':
            return 'badge-success';
        case 'complete':
            return 'badge-primary';
        case 'pending':
            return 'badge-warning';
        case 'cancelled':
            return 'badge-danger';
        default:
            return 'badge-primary';
    }
}

function getPackageStatus(pkg) {
    if (pkg.remaining === 0) return 'Used Up';
    if (pkg.expiryDate && pkg.expiryDate < new Date()) return 'Expired';
    return 'Active';
}

function getPackageStatusBadge(pkg) {
    const status = getPackageStatus(pkg);
    switch (status) {
        case 'Active':
            return 'badge-success';
        case 'Expired':
            return 'badge-danger';
        case 'Used Up':
            return 'badge-warning';
        default:
            return 'badge-primary';
    }
}

// Export to CSV (Excel-compatible)
function exportData(type) {
    let data, filename, headers;
    
    switch (type) {
        case 'clients':
            data = allData.clients;
            filename = 'clients.csv';
            headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
            break;
        case 'trainers':
            data = allData.trainers;
            filename = 'trainers.csv';
            headers = ['Name', 'Email', 'Specialties', 'Status'];
            break;
        case 'bookings':
            data = allData.bookings;
            filename = 'bookings.csv';
            headers = ['Client', 'Trainer', 'Date & Time', 'Duration', 'Status'];
            break;
        case 'packages':
            data = allData.packages;
            filename = 'packages.csv';
            headers = ['Client', 'Package Type', 'Total Lessons', 'Remaining', 'Purchase Date', 'Status'];
            break;
        default:
            console.error('Unknown export type:', type);
            return;
    }
    
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Convert to CSV
    let csv = headers.join(',') + '\n';
    
    data.forEach(item => {
        let row;
        switch (type) {
            case 'clients':
                row = [
                    item.name,
                    item.email,
                    item.phone,
                    item.role,
                    item.isActive ? 'Active' : 'Inactive',
                    item.joinedAt ? item.joinedAt.toLocaleDateString() : 'N/A'
                ];
                break;
            case 'trainers':
                row = [
                    item.name,
                    item.email,
                    item.specialties.join('; '),
                    item.isActive ? 'Active' : 'Inactive'
                ];
                break;
            case 'bookings':
                row = [
                    item.clientName,
                    item.trainerName,
                    item.scheduledTime ? item.scheduledTime.toLocaleString() : 'N/A',
                    item.duration + ' min',
                    item.status
                ];
                break;
            case 'packages':
                row = [
                    item.userName,
                    item.type,
                    item.total,
                    item.remaining,
                    item.purchaseDate ? item.purchaseDate.toLocaleDateString() : 'N/A',
                    getPackageStatus(item)
                ];
                break;
        }
        
        // Escape commas and quotes
        row = row.map(val => {
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                return '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        });
        
        csv += row.join(',') + '\n';
    });
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    // Client search
    const clientSearch = document.getElementById('clientSearch');
    if (clientSearch) {
        clientSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredClients = allData.clients.filter(client => 
                client.name.toLowerCase().includes(searchTerm) ||
                client.email.toLowerCase().includes(searchTerm)
            );
            
            // Re-render with filtered data
            const container = document.getElementById('clientsList');
            const html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredClients.map(client => `
                            <tr>
                                <td><strong>${client.name}</strong></td>
                                <td>${client.email}</td>
                                <td>${client.phone}</td>
                                <td><span class="badge badge-primary">${client.role}</span></td>
                                <td><span class="badge ${client.isActive ? 'badge-success' : 'badge-danger'}">${client.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>${client.joinedAt ? client.joinedAt.toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            container.innerHTML = html;
        });
    }
    
    // Booking search
    const bookingSearch = document.getElementById('bookingSearch');
    if (bookingSearch) {
        bookingSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // First apply the time filter
            let bookingsToSearch = allData.bookings;
            const now = new Date();
            
            if (currentBookingFilter === 'upcoming') {
                bookingsToSearch = allData.bookings.filter(b => b.scheduledTime && b.scheduledTime > now);
            } else if (currentBookingFilter === 'past') {
                bookingsToSearch = allData.bookings.filter(b => b.scheduledTime && b.scheduledTime <= now);
            }
            
            // Then apply search term
            const filteredBookings = bookingsToSearch.filter(booking => 
                booking.clientName.toLowerCase().includes(searchTerm) ||
                booking.trainerName.toLowerCase().includes(searchTerm)
            );
            
            const container = document.getElementById('bookingsList');
            
            if (filteredBookings.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No Bookings</h3><p>No bookings match your search.</p></div>';
                return;
            }
            
            const html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Trainer</th>
                            <th>Date & Time</th>
                            <th>Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredBookings.map(booking => `
                            <tr>
                                <td><strong>${booking.clientName}</strong></td>
                                <td>${booking.trainerName}</td>
                                <td>${booking.scheduledTime ? booking.scheduledTime.toLocaleString() : 'N/A'}</td>
                                <td>${booking.duration} min</td>
                                <td><span class="badge ${getStatusBadge(booking.status)}">${booking.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            container.innerHTML = html;
        });
    }
});

// Filter bookings by time
function filterBookings(filter) {
    currentBookingFilter = filter;
    
    // Update button styles
    document.getElementById('filterAll').classList.remove('btn-primary');
    document.getElementById('filterAll').classList.add('btn-outline');
    document.getElementById('filterUpcoming').classList.remove('btn-primary');
    document.getElementById('filterUpcoming').classList.add('btn-outline');
    document.getElementById('filterPast').classList.remove('btn-primary');
    document.getElementById('filterPast').classList.add('btn-outline');
    
    const activeButton = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
    if (activeButton) {
        activeButton.classList.remove('btn-outline');
        activeButton.classList.add('btn-primary');
    }
    
    renderBookings();
}
