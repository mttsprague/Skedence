import * as admin from 'firebase-admin';
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/bookings
 * List all bookings for the organization
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { 
      limit = 100, 
      offset = 0, 
      status, 
      trainerId, 
      clientId,
      startDate,
      endDate 
    } = req.query;

    let query = admin.firestore()
      .collection('bookings')
      .where('orgId', '==', orgId);

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (trainerId) {
      query = query.where('trainerId', '==', trainerId);
    }
    if (clientId) {
      query = query.where('clientId', '==', clientId);
    }
    if (startDate) {
      query = query.where('startTime', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate as string)));
    }
    if (endDate) {
      query = query.where('startTime', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate as string)));
    }

    query = query.orderBy('startTime', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    const snapshot = await query.get();

    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate?.()?.toISOString() || null,
      endTime: doc.data().endTime?.toDate?.()?.toISOString() || null,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    res.json({
      data: bookings,
      meta: {
        total: bookings.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch bookings.',
    });
  }
});

/**
 * GET /api/v1/bookings/:id
 * Get a specific booking by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;

    const bookingDoc = await admin.firestore()
      .collection('bookings')
      .doc(id)
      .get();

    if (!bookingDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found.',
      });
      return;
    }

    const bookingData = bookingDoc.data();

    // Verify booking belongs to the organization
    if (bookingData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Booking does not belong to your organization.',
      });
      return;
    }

    res.json({
      data: {
        id: bookingDoc.id,
        ...bookingData,
        startTime: bookingData?.startTime?.toDate?.()?.toISOString() || null,
        endTime: bookingData?.endTime?.toDate?.()?.toISOString() || null,
        createdAt: bookingData?.createdAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch booking.',
    });
  }
});

/**
 * POST /api/v1/bookings
 * Create a new booking
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const {
      clientId,
      trainerId,
      scheduleId,
      startTime,
      endTime,
      location,
      notes,
      packageId,
    } = req.body;

    // Validation
    if (!clientId || !trainerId || !scheduleId || !startTime || !endTime) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'clientId, trainerId, scheduleId, startTime, and endTime are required.',
      });
      return;
    }

    // Verify schedule is available
    const scheduleDoc = await admin.firestore()
      .collection('trainers')
      .doc(trainerId)
      .collection('schedules')
      .doc(scheduleId)
      .get();

    if (!scheduleDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Schedule slot not found.',
      });
      return;
    }

    if (scheduleDoc.data()?.isBooked) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Schedule slot is already booked.',
      });
      return;
    }

    // Create booking
    const bookingData = {
      orgId,
      clientId,
      trainerId,
      scheduleId,
      startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      location: location || '',
      notes: notes || '',
      packageId: packageId || null,
      status: 'confirmed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const bookingRef = await admin.firestore()
      .collection('bookings')
      .add(bookingData);

    // Mark schedule as booked
    await admin.firestore()
      .collection('trainers')
      .doc(trainerId)
      .collection('schedules')
      .doc(scheduleId)
      .update({
        isBooked: true,
        bookingId: bookingRef.id,
      });

    // If packageId provided, decrement lessons
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
      data: {
        id: bookingRef.id,
        ...bookingData,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create booking.',
    });
  }
});

/**
 * PUT /api/v1/bookings/:id
 * Update a booking
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;
    const { startTime, endTime, location, notes, status } = req.body;

    const bookingDoc = await admin.firestore()
      .collection('bookings')
      .doc(id)
      .get();

    if (!bookingDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found.',
      });
      return;
    }

    const bookingData = bookingDoc.data();

    if (bookingData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Booking does not belong to your organization.',
      });
      return;
    }

    const updates: any = {};
    if (startTime) updates.startTime = admin.firestore.Timestamp.fromDate(new Date(startTime));
    if (endTime) updates.endTime = admin.firestore.Timestamp.fromDate(new Date(endTime));
    if (location !== undefined) updates.location = location;
    if (notes !== undefined) updates.notes = notes;
    if (status) updates.status = status;

    await admin.firestore()
      .collection('bookings')
      .doc(id)
      .update(updates);

    res.json({
      data: {
        id,
        ...bookingData,
        ...updates,
        startTime: updates.startTime?.toDate?.()?.toISOString() || bookingData?.startTime?.toDate?.()?.toISOString(),
        endTime: updates.endTime?.toDate?.()?.toISOString() || bookingData?.endTime?.toDate?.()?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update booking.',
    });
  }
});

/**
 * DELETE /api/v1/bookings/:id
 * Cancel a booking
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;

    const bookingDoc = await admin.firestore()
      .collection('bookings')
      .doc(id)
      .get();

    if (!bookingDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found.',
      });
      return;
    }

    const bookingData = bookingDoc.data();

    if (bookingData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Booking does not belong to your organization.',
      });
      return;
    }

    // Mark booking as cancelled
    await admin.firestore()
      .collection('bookings')
      .doc(id)
      .update({
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Free up the schedule slot
    if (bookingData?.trainerId && bookingData?.scheduleId) {
      await admin.firestore()
        .collection('trainers')
        .doc(bookingData.trainerId)
        .collection('schedules')
        .doc(bookingData.scheduleId)
        .update({
          isBooked: false,
          bookingId: null,
        });
    }

    // Refund lesson if packageId exists
    if (bookingData?.packageId && bookingData?.clientId) {
      const packageRef = admin.firestore()
        .collection('organizations')
        .doc(orgId)
        .collection('users')
        .doc(bookingData.clientId)
        .collection('packages')
        .doc(bookingData.packageId);

      const packageDoc = await packageRef.get();
      if (packageDoc.exists) {
        const lessonsUsed = packageDoc.data()?.lessonsUsed || 0;
        if (lessonsUsed > 0) {
          await packageRef.update({
            lessonsUsed: lessonsUsed - 1,
            remainingLessons: admin.firestore.FieldValue.increment(1),
          });
        }
      }
    }

    res.json({
      message: 'Booking cancelled successfully.',
      data: {
        id,
        status: 'cancelled',
      },
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel booking.',
    });
  }
});

export default router;
