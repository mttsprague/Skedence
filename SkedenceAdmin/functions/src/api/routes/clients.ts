import * as admin from 'firebase-admin';
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/clients
 * List all clients for the organization
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { limit = 100, offset = 0, search } = req.query;

    let query = admin.firestore()
      .collection('users')
      .where('orgId', '==', orgId)
      .where('role', '==', 'client')
      .limit(Number(limit))
      .offset(Number(offset));

    const snapshot = await query.get();

    let clients = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Client-side search if provided (Firestore doesn't support full-text search)
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      clients = clients.filter(client => {
        const firstName = (client as any).firstName;
        const lastName = (client as any).lastName;
        const email = (client as any).email;
        return (
          firstName?.toLowerCase?.().includes(searchLower) ||
          lastName?.toLowerCase?.().includes(searchLower) ||
          email?.toLowerCase?.().includes(searchLower)
        );
      });
    }

    res.json({
      data: clients,
      meta: {
        total: clients.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch clients.',
    });
  }
});

/**
 * GET /api/v1/clients/:id
 * Get a specific client by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { id } = req.params;

    const clientDoc = await admin.firestore()
      .collection('users')
      .doc(id)
      .get();

    if (!clientDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Client not found.',
      });
      return;
    }

    const clientData = clientDoc.data();

    // Verify client belongs to the organization
    if (clientData?.orgId !== orgId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Client does not belong to your organization.',
      });
      return;
    }

    // Fetch client's packages
    const packagesSnapshot = await admin.firestore()
      .collection('organizations')
      .doc(orgId)
      .collection('users')
      .doc(id)
      .collection('packages')
      .get();

    const packages = packagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      purchaseDate: doc.data().purchaseDate?.toDate?.()?.toISOString() || null,
      expirationDate: doc.data().expirationDate?.toDate?.()?.toISOString() || null,
    }));

    res.json({
      data: {
        id: clientDoc.id,
        ...clientData,
        createdAt: clientData?.createdAt?.toDate?.()?.toISOString() || null,
        packages,
      },
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch client.',
    });
  }
});

/**
 * POST /api/v1/clients
 * Create a new client
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orgId } = req;
    const { firstName, lastName, email, phoneNumber } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'firstName, lastName, and email are required fields.',
      });
      return;
    }

    // Check if email already exists in this org
    const existingClient = await admin.firestore()
      .collection('users')
      .where('orgId', '==', orgId)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingClient.empty) {
      res.status(409).json({
        error: 'Conflict',
        message: 'A client with this email already exists in your organization.',
      });
      return;
    }

    // Create client document
    const clientData = {
      firstName,
      lastName,
      email,
      phoneNumber: phoneNumber || '',
      role: 'client',
      orgId,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const clientRef = await admin.firestore()
      .collection('users')
      .add(clientData);

    // Create orgMember entry
    await admin.firestore()
      .collection('orgMembers')
      .doc(`${clientRef.id}_${orgId}`)
      .set({
        userId: clientRef.id,
        orgId,
        role: 'client',
        isActive: true,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(201).json({
      data: {
        id: clientRef.id,
        ...clientData,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create client.',
    });
  }
});

export default router;
