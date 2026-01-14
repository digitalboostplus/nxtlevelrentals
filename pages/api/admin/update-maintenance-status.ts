import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { getFirestoreClient } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';
import {
  onStatusChanged,
  onNotesAdded,
  onTechnicianScheduled
} from '@/lib/notification-triggers';

interface UpdateStatusRequest {
  requestId: string;
  status?: MaintenanceStatus;
  adminNotes?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  technicianName?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const admin = firebaseAdmin;

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Verify admin role
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ message: 'Forbidden: User not found' });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'super-admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // Parse request body
    const {
      requestId,
      status,
      adminNotes,
      scheduledDate,
      scheduledTime,
      technicianName
    } = req.body as UpdateStatusRequest;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    // Get existing maintenance request
    const db = getFirestoreClient();
    const requestRef = doc(db, 'maintenanceRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    const existingRequest = {
      id: requestSnap.id,
      ...requestSnap.data()
    } as MaintenanceRequest;

    // Prepare updates
    const updates: Partial<MaintenanceRequest> = {
      updatedAt: Date.now()
    };

    let statusChanged = false;
    let notesAdded = false;
    let technicianScheduled = false;

    // Update status if provided
    if (status && status !== existingRequest.status) {
      updates.status = status;
      statusChanged = true;
    }

    // Update admin notes if provided
    if (adminNotes) {
      updates.adminNotes = existingRequest.adminNotes
        ? `${existingRequest.adminNotes}\n\n[${new Date().toISOString()}] ${adminNotes}`
        : adminNotes;
      notesAdded = true;
    }

    // Update scheduled date/time if provided
    if (scheduledDate) {
      updates.scheduledDate = new Date(scheduledDate).getTime();
      technicianScheduled = true;
    }

    // Update technician notes if technician name provided
    if (technicianName) {
      updates.technicianNotes = technicianName;
    }

    // Apply updates to Firestore
    await updateDoc(requestRef, updates);

    // Get updated request
    const updatedRequestSnap = await getDoc(requestRef);
    const updatedRequest = {
      id: updatedRequestSnap.id,
      ...updatedRequestSnap.data()
    } as MaintenanceRequest;

    // Trigger notifications asynchronously (don't block response)
    const adminName = userData?.displayName || 'Admin';

    // Status change notification
    if (statusChanged && status) {
      onStatusChanged(
        updatedRequest,
        existingRequest.status,
        status,
        adminName
      ).catch(error => {
        console.error('Failed to send status change notification:', error);
      });
    }

    // Notes added notification (only if notes were actually added, not just status change)
    if (notesAdded && adminNotes) {
      onNotesAdded(
        updatedRequest,
        adminName,
        adminNotes
      ).catch(error => {
        console.error('Failed to send notes added notification:', error);
      });
    }

    // Technician scheduled notification
    if (technicianScheduled && scheduledDate) {
      onTechnicianScheduled(
        updatedRequest,
        scheduledDate,
        scheduledTime,
        technicianName
      ).catch(error => {
        console.error('Failed to send technician scheduled notification:', error);
      });
    }

    // Return updated request
    return res.status(200).json({
      success: true,
      request: updatedRequest,
      notificationsSent: {
        statusChange: statusChanged,
        notesAdded: notesAdded,
        technicianScheduled: technicianScheduled
      }
    });
  } catch (error: any) {
    console.error('Error updating maintenance status:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
