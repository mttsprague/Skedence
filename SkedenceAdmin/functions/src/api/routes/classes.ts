import * as admin from 'firebase-admin';
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/classes
 * List all classes for the organization
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { upcoming, limit = 100, offset = 0 } = req.query;

    let query = admin.firestore()
      .collection('classes')
      .where('orgId', '==', orgId);

    // Filter by upcoming/past
    if (upcoming === 'true') {
      query = query.where('endTime', '>', admin.firestore.Timestamp.now());
    } else if (upcoming === 'false') {
      query = query.where('endTime', '<=', admin.firestore.Timestamp.now());
    }

    query = query.orderBy('endTime', upcoming === 'false' ? 'desc' : 'asc')
      .limit(Number(limit))
      .offset(Number(offset));

    const snapshot = await query.get();

    const classes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate?.()?.toISOString() || null,
      endTime: doc.data().endTime?.toDate?.()?.toISOString() || null,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    res.json({
      data: classes,
      meta: {
        total: classes.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch classes.',
    });
  }
});

/**
 * GET /api/v1/classes/:id
 * Get a specific class by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;

    const classDoc = await admin.firestore()
      .collection('classes')
      .doc(id)
      .get();

    if (!classDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Class not found.',
      });
      return;
    }

    const classData = classDoc.data();

    if (classData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Class does not belong to your organization.',
      });
      return;
    }

    res.json({
      data: {
        id: classDoc.id,
        ...classData,
        startTime: classData?.startTime?.toDate?.()?.toISOString() || null,
        endTime: classData?.endTime?.toDate?.()?.toISOString() || null,
        createdAt: classData?.createdAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch class.',
    });
  }
});

/**
 * GET /api/v1/classes/:id/participants
 * Get participants for a class
 */
router.get('/:id/participants', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;

    // Verify class belongs to org
    const classDoc = await admin.firestore()
      .collection('classes')
      .doc(id)
      .get();

    if (!classDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Class not found.',
      });
      return;
    }

    if (classDoc.data()?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Class does not belong to your organization.',
      });
      return;
    }

    // Get participants from subcollection
    const participantsSnapshot = await admin.firestore()
      .collection('classes')
      .doc(id)
      .collection('participants')
      .get();

    const participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      registeredAt: doc.data().registeredAt?.toDate?.()?.toISOString() || null,
    }));

    res.json({
      data: participants,
      meta: {
        classId: id,
        total: participants.length,
      },
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch participants.',
    });
  }
});

/**
 * POST /api/v1/classes/:id/register
 * Register a client for a class
 */
router.post('/:id/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;
    const { clientId, packageId } = req.body;

    if (!clientId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'clientId is required.',
      });
      return;
    }

    // Verify class belongs to org
    const classDoc = await admin.firestore()
      .collection('classes')
      .doc(id)
      .get();

    if (!classDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Class not found.',
      });
      return;
    }

    const classData = classDoc.data();

    if (classData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Class does not belong to your organization.',
      });
      return;
    }

    // Check capacity
    if (classData.currentParticipants >= classData.maxParticipants) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Class is at full capacity.',
      });
      return;
    }

    // Get client info
    const clientDoc = await admin.firestore()
      .collection('users')
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Client not found.',
      });
      return;
    }

    const clientData = clientDoc.data();

    // Add participant
    await admin.firestore()
      .collection('classes')
      .doc(id)
      .collection('participants')
      .doc(clientId)
      .set({
        userId: clientId,
        firstName: clientData?.firstName || '',
        lastName: clientData?.lastName || '',
        email: clientData?.email || '',
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        classPassPackageId: packageId || null,
      });

    // Update participant count
    await admin.firestore()
      .collection('classes')
      .doc(id)
      .update({
        currentParticipants: admin.firestore.FieldValue.increment(1),
      });

    // Decrement package lesson if provided
    if (packageId) {
      const packageRef = admin.firestore()
        .collection('organizations')
        .doc(orgId)
        .collection('users')
        .doc(clientId)
        .collection('packages')
        .doc(packageId);

      const packageDoc = await packageRef.get();
      if (packageDoc.exists) {
        const lessonsUsed = packageDoc.data()?.lessonsUsed || 0;
        await packageRef.update({
          lessonsUsed: lessonsUsed + 1,
          remainingLessons: admin.firestore.FieldValue.increment(-1),
        });
      }
    }

    res.status(201).json({
      message: 'Client registered for class successfully.',
      data: {
        classId: id,
        clientId,
        registeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error registering for class:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register for class.',
    });
  }
});

export default router;
