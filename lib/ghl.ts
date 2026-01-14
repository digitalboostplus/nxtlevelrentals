const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Custom Field IDs (from our discovery script)
const FIELD_IDS = {
    LEASE_START: 'xflK4edwKFVm1pHLJxew',
    LEASE_END: 'nMzB4QirjN9XP6BQwp0N',
    LEASE_ACTIVE: 'KMpvAs09LKwF1mQoY6LV',
    // LEASE_PDF: '...' // PDF field not found yet
};

export type GHLContact = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    leaseStart?: string;
    leaseEnd?: string;
    isLeaseActive?: boolean;
};

export const getGHLContactByEmail = async (email: string): Promise<GHLContact | null> => {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.LOCATION_ID;

    if (!token) throw new Error('Missing GHL_ACCESS_TOKEN');

    // V2 Search Endpoint
    // Docs: POST /contacts/search
    const searchUrl = `${GHL_API_BASE}/contacts/search`;

    const res = await fetch(searchUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            locationId,
            query: email, // Generic query often works best for email in V2
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`GHL Search Error ${res.status}:`, errorText);
        return null;
    }

    const data = await res.json();
    const contact = data.contacts?.find((c: any) => c.email?.toLowerCase() === email.toLowerCase());

    if (!contact) return null;

    return parseGHLContact(contact);
};

const parseGHLContact = (raw: any): GHLContact => {
    // Parse Custom Fields
    // V2 usually returns 'customFields' as an array: [{id: '...', value: '...'}]
    const fields = raw.customFields || [];

    const getFieldVal = (id: string) => fields.find((f: any) => f.id === id)?.value;

    return {
        id: raw.id,
        email: raw.email,
        firstName: raw.firstName,
        lastName: raw.lastName,
        phone: raw.phone,
        leaseStart: getFieldVal(FIELD_IDS.LEASE_START),
        leaseEnd: getFieldVal(FIELD_IDS.LEASE_END),
        // Checkbox values can be string "true", boolean true, or array ["true"]
        isLeaseActive: Boolean(getFieldVal(FIELD_IDS.LEASE_ACTIVE))
    };
};
