import * as admin from 'firebase-admin';
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/reports/revenue
 * Get revenue statistics
 */
router.get('/revenue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let query = admin.firestore()
      .collection('organizations')
      .doc(orgId)
      .collection('users')
      .where('role', '==', 'client');

    const usersSnapshot = await query.get();
    const userIds = usersSnapshot.docs.map(doc => doc.id);

    let totalRevenue = 0;
    const revenueByDate: { [key: string]: number } = {};

    // Query all packages for all users
    for (const userId of userIds) {
      let packageQuery = admin.firestore()
        .collection('organizations')
        .doc(orgId)
        .collection('users')
        .doc(userId)
        .collection('packages');

      if (startDate) {
        packageQuery = packageQuery.where(
          'purchaseDate',
          '>=',
          admin.firestore.Timestamp.fromDate(new Date(startDate as string))
        ) as any;
      }
      if (endDate) {
        packageQuery = packageQuery.where(
          'purchaseDate',
          '<=',
          admin.firestore.Timestamp.fromDate(new Date(endDate as string))
        ) as any;
      }

      const packagesSnapshot = await packageQuery.get();

      packagesSnapshot.docs.forEach(doc => {
        const amountPaid = doc.data().amountPaid || 0;
        totalRevenue += amountPaid;

        // Group by date
        const purchaseDate = doc.data().purchaseDate?.toDate();
        if (purchaseDate) {
          const dateKey = purchaseDate.toISOString().split('T')[0];
          revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + amountPaid;
        }
      });
    }

    const revenueData = Object.entries(revenueByDate).map(([date, amount]) => ({
      date,
      amount,
      amountFormatted: `$${(amount / 100).toFixed(2)}`,
    }));

    res.json({
      data: {
        totalRevenue,
        totalRevenueFormatted: `$${(totalRevenue / 100).toFixed(2)}`,
        revenueByDate: revenueData,
      },
      meta: {
        startDate: startDate || null,
        endDate: endDate || null,
        groupBy,
      },
    });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch revenue report.',
    });
  }
});

/**
 * GET /api/v1/reports/bookings
 * Get booking statistics
 */
router.get('/bookings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { startDate, endDate } = req.query;

    let query = admin.firestore()
      .collection('bookings')
      .where('orgId', '==', orgId);

    if (startDate) {
      query = query.where('startTime', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate as string)));
    }
    if (endDate) {
      query = query.where('startTime', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate as string)));
    }

    const snapshot = await query.get();

    const stats = {
      total: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      byTrainer: {} as { [key: string]: number },
      byStatus: {} as { [key: string]: number },
    };

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      stats.total++;

      // Count by status
      const status = data.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      if (status === 'confirmed') stats.confirmed++;
      if (status === 'cancelled') stats.cancelled++;
      if (status === 'completed') stats.completed++;

      // Count by trainer
      const trainerId = data.trainerId;
      if (trainerId) {
        stats.byTrainer[trainerId] = (stats.byTrainer[trainerId] || 0) + 1;
      }
    });

    res.json({
      data: stats,
      meta: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error) {
    console.error('Error fetching bookings report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch bookings report.',
    });
  }
});

/**
 * GET /api/v1/reports/clients
 * Get client statistics
 */
router.get('/clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;

    const usersSnapshot = await admin.firestore()
      .collection('users' )
      .where('orgId', '==', orgId)
      .where('role', '==', 'client')
      .get();

    const stats = {
      total: usersSnapshot.size,
      active: 0,
      inactive: 0,
      withActivePackages: 0,
    };

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.isActive) {
        stats.active++;
      } else {
        stats.inactive++;
      }

      // Check for active packages
      const packagesSnapshot = await admin.firestore()
        .collection('organizations')
        .doc(orgId)
        .collection('users')
        .doc(userDoc.id)
        .collection('packages')
        .where('remainingLessons', '>', 0)
        .limit(1)
        .get();

      if (!packagesSnapshot.empty) {
        stats.withActivePackages++;
      }
    }

    res.json({
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching clients report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch clients report.',
    });
  }
});

export default router;
