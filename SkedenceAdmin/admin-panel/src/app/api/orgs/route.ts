import { NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Simple auth check using request header (you can enhance this)
    const adminEmail = request.headers.get('x-admin-email');
    
    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getFirestoreAdmin();
    
    // Fetch all organizations
    const orgsSnapshot = await db.collection('organizations').get();
    
    const organizations = await Promise.all(
      orgsSnapshot.docs.map(async (doc) => {
        const orgData = doc.data();
        
        // Get member count
        const membersSnapshot = await db
          .collection('organizations')
          .doc(doc.id)
          .collection('members')
          .get();
        
        return {
          id: doc.id,
          name: orgData.name || 'Unnamed Organization',
          stripeCustomerId: orgData.stripeCustomerId,
          subscriptionStatus: orgData.subscriptionStatus,
          subscriptionPlan: orgData.subscriptionPlan,
          createdAt: orgData.createdAt,
          disabled: orgData.disabled || false,
          memberCount: membersSnapshot.size,
        };
      })
    );

    // Calculate stats
    const stats = {
      totalOrgs: organizations.length,
      activeSubscriptions: organizations.filter(o => o.subscriptionStatus === 'active').length,
      trialingOrgs: organizations.filter(o => o.subscriptionStatus === 'trialing').length,
      disabledOrgs: organizations.filter(o => o.disabled).length,
    };

    return NextResponse.json({
      organizations,
      stats,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
