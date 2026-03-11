import * as admin from 'firebase-admin';
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/trainers
 * List all trainers for the organization
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { active } = req.query;

    let query = admin.firestore()
      .collection('trainers')
      .where('orgId', '==', orgId);

    if (active !== undefined) {
      query = query.where('active', '==', active === 'true');
    }

    const snapshot = await query.get();

    const trainers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    res.json({
      data: trainers,
      meta: {
        total: trainers.length,
      },
    });
  } catch (error) {
    console.error('Error fetching trainers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch trainers.',
    });
  }
});

/**
 * GET /api/v1/trainers/:id
 * Get a specific trainer by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;

    const trainerDoc = await admin.firestore()
      .collection('trainers')
      .doc(id)
      .get();

    if (!trainerDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Trainer not found.',
      });
      return;
    }

    const trainerData = trainerDoc.data();

    if (trainerData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Trainer does not belong to your organization.',
      });
      return;
    }

    res.json({
      data: {
        id: trainerDoc.id,
        ...trainerData,
        createdAt: trainerData?.createdAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching trainer:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch trainer.',
    });
  }
});

/**
 * GET /api/v1/trainers/:id/availability
 * Get trainer's availability (unbooked schedule slots)
 */
router.get('/:id/availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Verify trainer belongs to org
    const trainerDoc = await admin.firestore()
      .collection('trainers')
      .doc(id)
      .get();

    if (!trainerDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Trainer not found.',
      });
      return;
    }

    if (trainerDoc.data()?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Trainer does not belong to your organization.',
      });
      return;
    }

    // Query availability
    let query = admin.firestore()
      .collection('trainers')
      .doc(id)
      .collection('schedules')
      .where('isBooked', '==', false);

    if (startDate) {
      query = query.where('startTime', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate as string)));
    }
    if (endDate) {
      query = query.where('startTime', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate as string)));
    }

    query = query.orderBy('startTime', 'asc').limit(100);

    const snapshot = await query.get();

    const availability = snapshot.docs.map(doc => ({
      id: doc.id,
      startTime: doc.data().startTime?.toDate?.()?.toISOString() || null,
      endTime: doc.data().endTime?.toDate?.()?.toISOString() || null,
      location: doc.data().location || null,
    }));

    res.json({
      data: availability,
      meta: {
        trainerId: id,
        total: availability.length,
      },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch availability.',
    });
  }
});

export default router;
