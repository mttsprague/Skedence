import { NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const adminEmail = request.headers.get('x-admin-email');
    
    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orgId } = await params;
    const db = getFirestoreAdmin();
    const orgDoc = await db.collection('organizations').doc(orgId).get();

    if (!orgDoc.exists) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const orgData = orgDoc.data();

    // Fetch members
    const membersSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('members')
      .get();

    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch recent activity/events (if you have an events collection)
    const eventsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('events')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    const recentEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      organization: {
        id: orgDoc.id,
        ...orgData,
      },
      members,
      recentEvents,
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const adminEmail = request.headers.get('x-admin-email');
    
    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orgId } = await params;
    const body = await request.json();
    const db = getFirestoreAdmin();

    await db.collection('organizations').doc(orgId).update({
      ...body,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
