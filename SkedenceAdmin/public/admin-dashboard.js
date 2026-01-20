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
let currentPackageSort = { column: null, direction: 'asc' };
let currentPackageClientFilter = 'all';
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

// Password reset handlers
window.showForgotPassword = function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    
    if (!email) {
        alert('Please enter your email address first.');
        document.getElementById('loginEmail').focus();
        return;
    }
    
    if (confirm(`Send password reset email to ${email}?`)) {
        sendPasswordResetEmail(email, 'resetMessage');
    }
};

window.resetPasswordFromAccount = function() {
    const email = currentUser?.email;
    if (email) {
        sendPasswordResetEmail(email, 'accountResetMessage');
    }
};

async function sendPasswordResetEmail(email, messageElementId) {
    const messageDiv = document.getElementById(messageElementId);
    
    try {
        // Send password reset email (Firebase will use default settings)
        await auth.sendPasswordResetEmail(email);
        
        messageDiv.textContent = `✅ Password reset email sent to ${email}. Please check your inbox.`;
        messageDiv.className = 'alert alert-success';
        messageDiv.classList.remove('hidden');
        
        // Hide message after 10 seconds
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 10000);
    } catch (error) {
        console.error('Password reset error:', error);
        messageDiv.textContent = `❌ Error: ${error.message}`;
        messageDiv.className = 'alert alert-error';
        messageDiv.classList.remove('hidden');
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
    console.log('showDashboard called');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    
    // Setup mobile menu after dashboard is visible
    setTimeout(() => {
        setupMobileMenu();
    }, 100);
}

// Setup mobile menu event listeners
function setupMobileMenu() {
    console.log('setupMobileMenu called');
    const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
    console.log('Button found:', mobileMenuBtn);
    
    if (mobileMenuBtn) {
        console.log('Mobile menu button found, adding event listener');
        
        // Simple inline approach for iOS
        mobileMenuBtn.onclick = function(e) {
            console.log('Button onclick fired!');
            e.preventDefault();
            e.stopPropagation();
            window.toggleMobileMenu();
            return false;
        };
        
        // Add touchstart for iOS (more reliable than touchend)
        mobileMenuBtn.addEventListener('touchstart', function(e) {
            console.log('Button touchstart fired!');
            e.preventDefault();
            window.toggleMobileMenu();
        }, { passive: false });
    } else {
        console.log('Mobile menu button NOT found');
    }
}

// Show section
window.showSection = function(sectionName) {
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
    if (event && event.target) {
        const item = event.target.closest('.sidebar-item');
        if (item) item.classList.add('active');
    }
    
    // Populate account section if showing it
    if (sectionName === 'account' && currentUser) {
        document.getElementById('accountEmail').value = currentUser.email || '';
        document.getElementById('accountOrgName').value = document.getElementById('orgName').textContent || '';
    }
    
    // Close mobile menu after selection
    if (window.closeMobileMenu) {
        window.closeMobileMenu();
    }
}

// Mobile menu functions
window.toggleMobileMenu = function() {
    console.log('Toggle mobile menu called');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
        console.log('Sidebar classes:', sidebar.className);
    } else {
        console.error('Sidebar or overlay not found');
    }
}

window.closeMobileMenu = function() {
    console.log('Close mobile menu called');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
    }
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
    
    // Calculate booking stats for each trainer
    const now = new Date();
    const trainerStats = allData.trainers.map(trainer => {
        // Match bookings by trainerId OR trainerName
        const trainerBookings = allData.bookings.filter(b => {
            const matchesId = b.trainerId === trainer.id || b.trainerUID === trainer.id;
            const matchesName = b.trainerName === trainer.name;
            return matchesId || matchesName;
        });
        
        console.log(`Trainer ${trainer.name}: Found ${trainerBookings.length} bookings`);
        
        // Completed: bookings where endTime is in the past
        const completed = trainerBookings.filter(b => {
            if (!b.endTime && !b.startTime) return false;
            const endTime = b.endTime || (b.startTime ? new Date(b.startTime.getTime() + 60 * 60000) : null);
            return endTime && endTime < now && b.status !== 'cancelled';
        }).length;
        
        // Upcoming: bookings where startTime is in the future
        const upcoming = trainerBookings.filter(b => {
            if (!b.startTime) return false;
            return b.startTime > now && b.status !== 'cancelled';
        }).length;
        
        return {
            ...trainer,
            completed,
            upcoming,
            total: completed + upcoming
        };
    });
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Specialties</th>
                    <th>Status</th>
                    <th>Completed</th>
                    <th>Upcoming</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${trainerStats.map(trainer => `
                    <tr>
                        <td><strong>${trainer.name}</strong></td>
                        <td>${trainer.email}</td>
                        <td>${trainer.specialties.join(', ') || 'None'}</td>
                        <td><span class="badge ${trainer.isActive ? 'badge-success' : 'badge-danger'}">${trainer.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td><strong>${trainer.completed}</strong></td>
                        <td><strong>${trainer.upcoming}</strong></td>
                        <td><strong>${trainer.total}</strong></td>
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
        
        // Query bookings for this organization
        const bookingsSnapshot = await db.collection('bookings')
            .where('orgId', '==', currentOrgId)
            .get();
        
        console.log('Found bookings:', bookingsSnapshot.size);
        
        const orgBookings = bookingsSnapshot.docs;
        
        const bookingPromises = orgBookings.map(async (doc) => {
            const data = doc.data();
            console.log('Raw booking data:', doc.id, 'Fields:', Object.keys(data), 'Data:', data);
            
            // Get client name - try multiple field names
            let clientName = 'Unknown';
            const clientId = data.clientId || data.userId || data.clientUID || data.user_id;
            console.log('Looking for client with ID:', clientId);
            
            try {
                if (clientId) {
                    const userDoc = await db.collection('users').doc(clientId).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        console.log('Client data for booking:', clientId, userData);
                        const firstName = userData.firstName || '';
                        const lastName = userData.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        clientName = fullName || userData.name || 'Unknown';
                        console.log('Resolved client name:', clientName);
                    } else {
                        console.log('User document not found for clientId:', clientId);
                    }
                } else {
                    console.log('No clientId found in booking data. Available fields:', Object.keys(data));
                }
            } catch (err) {
                console.error('Error fetching client:', err.message);
                // Use clientName from booking if available
                clientName = data.clientName || 'Unknown';
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
                    const fullName = `${firstName} ${lastName}`.trim();
                    trainerName = fullName || trainerData.name || 'Unknown';
                    console.log('Resolved trainer name:', trainerName);
                } else {
                    console.log('Trainer document not found for trainerId:', data.trainerId);
                }
            } catch (err) {
                console.error('Error fetching trainer:', err);
            }
            
            // Try multiple field names for scheduled time
            const scheduledTimeField = data.scheduledTime || data.startTime || data.start_time || data.bookingTime;
            const scheduledTime = scheduledTimeField ? new Date(scheduledTimeField.toMillis()) : null;
            const bookingStatus = getBookingStatus(data, scheduledTime);
            
            console.log('Booking processed:', {
                id: doc.id,
                clientName,
                trainerName,
                scheduledTime,
                status: bookingStatus,
                rawFields: Object.keys(data)
            });
            
            return {
                id: doc.id,
                clientName,
                trainerName,
                trainerId: data.trainerId || data.trainerUID,
                scheduledTime: scheduledTime,
                startTime: data.startTime ? new Date(data.startTime.toMillis()) : scheduledTime,
                endTime: data.endTime ? new Date(data.endTime.toMillis()) : null,
                status: bookingStatus,
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
        renderTrainers(); // Re-render trainers to update booking stats
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
                console.log('Package data:', pkgDoc.id, pkgData);
                
                // Get user name
                let userName = 'Unknown';
                try {
                    const userDoc = await db.collection('users').doc(userId).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const firstName = userData.firstName || '';
                        const lastName = userData.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        userName = fullName || userData.name || 'Unknown';
                    }
                } catch (err) {
                    console.error('Error fetching user:', err);
                }
                
                // Calculate remaining lessons
                const total = pkgData.totalLessons || pkgData.total || 0;
                const used = pkgData.lessonsUsed || pkgData.used || 0;
                const remaining = pkgData.remainingLessons !== undefined 
                    ? pkgData.remainingLessons 
                    : (total - used);
                
                console.log('Package:', pkgDoc.id, 'Total:', total, 'Used:', used, 'Remaining:', remaining);
                
                userPackages.push({
                    id: pkgDoc.id,
                    userId,
                    userName,
                    type: pkgData.packageType || pkgData.type || 'Unknown',
                    total: total,
                    remaining: remaining,
                    amountPaid: pkgData.amountPaid || pkgData.amount || pkgData.price || 0,
                    purchaseDate: pkgData.purchaseDate ? new Date(pkgData.purchaseDate.toMillis()) : null,
                    expiryDate: pkgData.expiryDate ? new Date(pkgData.expiryDate.toMillis()) : null
                });
            }
            
            return userPackages;
        });
        
        const allPackages = await Promise.all(packagePromises);
        allData.packages = allPackages.flat();
        renderPackages();
        renderRevenue();
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

// Render packages
function renderPackages(packagesToRender = null) {
    const container = document.getElementById('packagesList');
    let packages = packagesToRender || allData.packages;
    
    // Apply client filter
    if (currentPackageClientFilter !== 'all') {
        packages = packages.filter(pkg => pkg.userId === currentPackageClientFilter);
    }
    
    // Apply sorting
    if (currentPackageSort.column) {
        packages = [...packages].sort((a, b) => {
            let aVal, bVal;
            
            if (currentPackageSort.column === 'client') {
                aVal = a.userName.toLowerCase();
                bVal = b.userName.toLowerCase();
            } else if (currentPackageSort.column === 'date') {
                aVal = a.purchaseDate ? a.purchaseDate.getTime() : 0;
                bVal = b.purchaseDate ? b.purchaseDate.getTime() : 0;
            }
            
            if (aVal < bVal) return currentPackageSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentPackageSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    if (packages.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎫</div><h3>No Packages</h3><p>No packages match your filters.</p></div>';
        return;
    }
    
    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th class="sortable-header ${currentPackageSort.column === 'client' ? 'sorted-' + currentPackageSort.direction : ''}" onclick="sortPackages('client')">Client</th>
                    <th>Package Type</th>
                    <th>Total Lessons</th>
                    <th>Remaining</th>
                    <th class="sortable-header ${currentPackageSort.column === 'date' ? 'sorted-' + currentPackageSort.direction : ''}" onclick="sortPackages('date')">Purchase Date</th>
                    <th>Revenue</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${packages.map(pkg => `
                    <tr>
                        <td><strong>${pkg.userName}</strong></td>
                        <td>${pkg.type}</td>
                        <td>${pkg.total}</td>
                        <td><strong>${pkg.remaining}</strong></td>
                        <td>${pkg.purchaseDate ? pkg.purchaseDate.toLocaleDateString() : 'N/A'}</td>
                        <td><strong>$${((pkg.amountPaid || 0) / 100).toFixed(2)}</strong></td>
                        <td><span class="badge ${getPackageStatusBadge(pkg)}">${getPackageStatus(pkg)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Render revenue section
function renderRevenue() {
    // Calculate total revenue (convert from cents to dollars)
    const totalRevenue = allData.packages.reduce((sum, pkg) => sum + (pkg.amountPaid || 0), 0) / 100;
    
    // Calculate this month's revenue
    const now = new Date();
    const thisMonthPackages = allData.packages.filter(pkg => {
        if (!pkg.purchaseDate) return false;
        return pkg.purchaseDate.getMonth() === now.getMonth() && 
               pkg.purchaseDate.getFullYear() === now.getFullYear();
    });
    const monthRevenue = thisMonthPackages.reduce((sum, pkg) => sum + (pkg.amountPaid || 0), 0) / 100;
    
    // Calculate average package value
    const avgRevenue = allData.packages.length > 0 ? totalRevenue / allData.packages.length : 0;
    
    // Active packages count
    const activePackages = allData.packages.filter(p => p.remaining > 0);
    
    // Update stats
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('monthRevenue').textContent = `$${monthRevenue.toFixed(2)}`;
    document.getElementById('avgPackageRevenue').textContent = `$${avgRevenue.toFixed(2)}`;
    document.getElementById('activePackagesCount').textContent = activePackages.length;
    
    // Revenue by package type
    const revenueByType = {};
    allData.packages.forEach(pkg => {
        const type = pkg.type;
        if (!revenueByType[type]) {
            revenueByType[type] = { count: 0, revenue: 0 };
        }
        revenueByType[type].count++;
        revenueByType[type].revenue += pkg.amountPaid || 0;
    });
    
    const revenueByTypeHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Package Type</th>
                    <th>Packages Sold</th>
                    <th>Total Revenue</th>
                    <th>Avg. Price</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(revenueByType).map(([type, data]) => `
                    <tr>
                        <td><strong>${type}</strong></td>
                        <td>${data.count}</td>
                        <td><strong>$${(data.revenue / 100).toFixed(2)}</strong></td>
                        <td>$${(data.revenue / data.count / 100).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('revenueByType').innerHTML = revenueByTypeHtml;
    
    // Recent packages (last 10)
    const recentPackages = [...allData.packages]
        .filter(pkg => pkg.purchaseDate)
        .sort((a, b) => b.purchaseDate - a.purchaseDate)
        .slice(0, 10);
    
    const recentPackagesHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Package Type</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${recentPackages.map(pkg => `
                    <tr>
                        <td>${pkg.purchaseDate.toLocaleDateString()}</td>
                        <td><strong>${pkg.userName}</strong></td>
                        <td>${pkg.type}</td>
                        <td><strong>$${((pkg.amountPaid || 0) / 100).toFixed(2)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('recentPackages').innerHTML = recentPackagesHtml;
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
    
    // If no scheduled time, return current status
    if (!scheduledTime) {
        return status;
    }
    
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
    
    // Package sorting function
    window.sortPackages = function(column) {
        if (currentPackageSort.column === column) {
            // Toggle direction
            currentPackageSort.direction = currentPackageSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentPackageSort.column = column;
            currentPackageSort.direction = 'asc';
        }
        renderPackages();
    };
    
    // Package client filter
    const packageClientFilter = document.getElementById('packageClientFilter');
    if (packageClientFilter) {
        // Populate filter with unique clients
        const uniqueClients = [...new Map(allData.packages.map(pkg => [pkg.userId, { id: pkg.userId, name: pkg.userName }])).values()];
        uniqueClients.sort((a, b) => a.name.localeCompare(b.name));
        
        uniqueClients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            packageClientFilter.appendChild(option);
        });
        
        packageClientFilter.addEventListener('change', (e) => {
            currentPackageClientFilter = e.target.value;
            renderPackages();
        });
    }
    
    // Package search
    const packageSearch = document.getElementById('packageSearch');
    if (packageSearch) {
        packageSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            const filteredPackages = allData.packages.filter(pkg => 
                pkg.userName.toLowerCase().includes(searchTerm)
            );
            
            renderPackages(filteredPackages);
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
