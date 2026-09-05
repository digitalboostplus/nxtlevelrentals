import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { pushMaintenanceToGHL } from '@/lib/ghl-sync';
import {
  addGHLContactNote,
  addGHLContactTags,
  getGHLContactByEmail,
  isGHLConfigured,
  upsertGHLContact,
} from '@/lib/ghl';
import { maintenanceCategories, maintenancePriorities } from '@/data/site';

// Public (unauthenticated) maintenance intake from the landing page.
//
// Tenants who never set up a portal account, or who are locked out of it, can
// still reach us. We match the submission to an existing tenant by email or
// phone when we can so it shows up on their record like a portal request;
// otherwise it is filed under tenantId "public" with the contact details on
// the document for the admin to link later.

type PublicMaintenanceBody = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  priority?: string;
  description?: string;
  permissionToEnter?: boolean;
  hasPets?: boolean;
  images?: string[];
  website?: string; // honeypot: real users never fill it
};

const MAX_IMAGES = 3;
const MAX_IMAGE_CHARS = 350_000; // ~250 KB each keeps the doc under Firestore's 1 MiB limit
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

// Best-effort per-instance limiter. Serverless instances do not share it, so
// it only blunts bursts; the honeypot and validation do the rest.
const recent = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > RATE_MAX;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const body = (req.body || {}) as PublicMaintenanceBody;

  // Bots fill every field; humans never see this one.
  if (body.website) {
    return res.status(200).json({ success: true });
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ message: 'Too many requests. Please call us instead.' });
  }

  const name = clean(body.name, 120);
  const phoneRaw = clean(body.phone, 40);
  const phone = normalizePhone(phoneRaw);
  const email = clean(body.email, 160).toLowerCase();
  const address = clean(body.address, 240);
  const category = clean(body.category, 40);
  const priority = clean(body.priority, 20);
  const description = clean(body.description, 4000);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!phone && !email) errors.phone = 'We need a phone number or email to reach you.';
  if (phone && phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a full phone number.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'That email does not look right.';
  if (address.length < 5) errors.address = 'Please enter the property address.';
  if (!(maintenanceCategories as readonly string[]).includes(category)) errors.category = 'Pick a category.';
  if (!(maintenancePriorities as readonly string[]).includes(priority)) errors.priority = 'Pick how urgent it is.';
  if (description.length < 15) errors.description = 'Add a few more details (15+ characters).';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please check the highlighted fields.', errors });
  }

  const images = Array.isArray(body.images)
    ? body.images
        .filter((img): img is string => typeof img === 'string' && img.startsWith('data:image/'))
        .filter((img) => img.length <= MAX_IMAGE_CHARS)
        .slice(0, MAX_IMAGES)
    : [];

  try {
    // Match to a known tenant so the request lands on their record.
    let tenantId = 'public';
    let propertyId = 'unassigned';
    let matchedUser: FirebaseFirestore.DocumentData | undefined;

    if (email) {
      const byEmail = await adminDb.collection('users').where('email', '==', email).limit(1).get();
      if (!byEmail.empty) {
        tenantId = byEmail.docs[0].id;
        matchedUser = byEmail.docs[0].data();
      }
    }
    if (tenantId === 'public' && phone) {
      const byPhone = await adminDb.collection('users').where('phoneNumber', '==', phone).limit(1).get();
      if (!byPhone.empty) {
        tenantId = byPhone.docs[0].id;
        matchedUser = byPhone.docs[0].data();
      }
    }
    if (matchedUser?.propertyIds?.[0]) {
      propertyId = matchedUser.propertyIds[0];
    }

    const now = Date.now();
    const title = `${category}: ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`;
    const requestRef = await adminDb.collection('maintenanceRequests').add({
      tenantId,
      tenantName: name,
      tenantPhone: phone || null,
      contactEmail: email || null,
      addressText: address,
      propertyId,
      title,
      description,
      priority,
      category,
      status: 'submitted',
      permissionToEnter: Boolean(body.permissionToEnter),
      hasPets: Boolean(body.hasPets),
      images,
      source: 'public-form',
      createdAt: now,
      updatedAt: now,
    });

    // Reflect it in the CRM. Never let a CRM hiccup fail the tenant's submission.
    try {
      if (tenantId !== 'public') {
        await pushMaintenanceToGHL({ tenantId, title, description, priority, status: 'submitted' });
      } else if (isGHLConfigured()) {
        const note =
          `Maintenance request (public form) "${title}" [${priority}/submitted]: ${description}\n` +
          `Address: ${address}\nPhone: ${phoneRaw || 'n/a'}\nEmail: ${email || 'n/a'}`;
        // GHL contacts key on email; a phone-only submission stays in Firestore
        // for the admin to link by hand.
        let contactId: string | null = null;
        if (email) {
          contactId = (await getGHLContactByEmail(email))?.id ?? null;
          if (!contactId) {
            const [firstName, ...rest] = name.split(/\s+/);
            contactId = await upsertGHLContact({
              email,
              firstName,
              lastName: rest.join(' ') || undefined,
              phone: phone || undefined,
              address,
              tags: ['public-maintenance-request'],
            });
          }
        }
        if (contactId) {
          await addGHLContactNote(contactId, note);
          await addGHLContactTags(contactId, ['maintenance-open']);
        }
      }
    } catch (ghlError) {
      console.error('Public maintenance GHL sync failed:', ghlError);
    }

    return res.status(200).json({ success: true, requestId: requestRef.id, matched: tenantId !== 'public' });
  } catch (error: any) {
    console.error('Error creating public maintenance request:', error);
    return res.status(500).json({ message: 'Something went wrong on our end. Please call us.' });
  }
}
