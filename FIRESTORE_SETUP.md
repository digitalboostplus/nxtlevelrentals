# 🔥 Firestore Database Setup Guide

## Quick Setup Instructions

### Step 1: Create Collections in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** in the left sidebar
4. Click **"Start collection"**

### Step 2: Create the `expenses` Collection

1. Collection ID: `expenses`
2. Add your first document with these fields:

| Field Name    | Type   | Example Value                      |
| ------------- | ------ | ---------------------------------- |
| property_name | string | "123 Main St, Apt 201"             |
| category      | string | "Maintenance"                      |
| description   | string | "HVAC compressor replacement"      |
| amount        | number | 1200                               |
| vendor        | string | "Cool Air HVAC"                    |
| date          | string | "2025-10-05T14:30:00.000Z"         |
| created_at    | string | "2025-10-05T14:30:00.000Z"         |

3. Click **Save**

### Step 3: (Optional) Create `properties` Collection

For future property management features:

1. Collection ID: `properties`
2. Add a document with these fields:

| Field Name        | Type   | Example Value         |
| ----------------- | ------ | --------------------- |
| address           | string | "123 Main St, Unit 1" |
| city              | string | "Portland"            |
| state             | string | "OR"                  |
| zip               | string | "97201"               |
| units             | number | 4                     |
| monthly_rent      | number | 4800                  |
| occupancy_rate    | number | 100                   |
| active_leases     | number | 4                     |
| total_income_ytd  | number | 28800                 |
| total_expenses_ytd| number | 5200                  |

### Step 4: Set Up Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Expenses collection - authenticated users only
    match /expenses/{expenseId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.keys().hasAll(['property_name', 'category', 'description', 'amount', 'vendor', 'date'])
        && request.resource.data.amount is number
        && request.resource.data.amount >= 0;
      allow update, delete: if request.auth != null;
    }
    
    // Properties collection
    match /properties/{propertyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Vendors collection (optional)
    match /vendors/{vendorId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Maintenance requests (optional, for future use)
    match /maintenance/{requestId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### Step 5: Create Firestore Indexes (for Performance)

1. Go to **Firestore Database** → **Indexes** → **Composite**
2. Click **Create Index**

**Index 1: Expenses by Date (Descending)**
- Collection ID: `expenses`
- Fields:
  - `date` - Descending
  - `__name__` - Ascending
- Query scope: Collection

**Index 2: Expenses by Date Range (for Reports)**
- Collection ID: `expenses`
- Fields:
  - `date` - Ascending
  - `category` - Ascending
- Query scope: Collection

*Note: Firebase will automatically prompt you to create indexes when needed via error messages in your console.*

## Sample Data for Testing

Use this data to populate your Firestore for testing:

### Expenses Collection

```javascript
// Expense 1
{
  property_name: "123 Main St, Apt 201",
  category: "Maintenance",
  description: "HVAC compressor replacement",
  amount: 1200,
  vendor: "Cool Air HVAC",
  date: "2025-10-05T14:30:00.000Z",
  created_at: "2025-10-05T14:30:00.000Z"
}

// Expense 2
{
  property_name: "456 Oak Ave, Unit B",
  category: "Utilities",
  description: "Electric bill - October",
  amount: 145.75,
  vendor: "Portland General Electric",
  date: "2025-10-01T09:00:00.000Z",
  created_at: "2025-10-01T09:00:00.000Z"
}

// Expense 3
{
  property_name: "789 Pine Blvd",
  category: "Maintenance",
  description: "Kitchen sink leak repair",
  amount: 325,
  vendor: "24/7 Plumbing Services",
  date: "2025-10-12T11:15:00.000Z",
  created_at: "2025-10-12T11:15:00.000Z"
}

// Expense 4
{
  property_name: "123 Main St, Apt 201",
  category: "Insurance",
  description: "Property insurance - Q4",
  amount: 850,
  vendor: "State Farm Insurance",
  date: "2025-10-01T08:00:00.000Z",
  created_at: "2025-10-01T08:00:00.000Z"
}

// Expense 5
{
  property_name: "456 Oak Ave, Unit B",
  category: "Maintenance",
  description: "Exterior painting touch-up",
  amount: 450,
  vendor: "Quality Painters Inc",
  date: "2025-10-18T13:00:00.000Z",
  created_at: "2025-10-18T13:00:00.000Z"
}

// Expense 6
{
  property_name: "789 Pine Blvd",
  category: "Taxes",
  description: "Property tax - Q4",
  amount: 1875,
  vendor: "County Tax Assessor",
  date: "2025-10-01T00:00:00.000Z",
  created_at: "2025-10-01T00:00:00.000Z"
}

// Expense 7
{
  property_name: "123 Main St, Apt 201",
  category: "Utilities",
  description: "Water/Sewer - October",
  amount: 92.50,
  vendor: "City Water Department",
  date: "2025-10-03T10:00:00.000Z",
  created_at: "2025-10-03T10:00:00.000Z"
}

// Expense 8
{
  property_name: "456 Oak Ave, Unit B",
  category: "Maintenance",
  description: "Dishwasher replacement - Unit 3",
  amount: 680,
  vendor: "Appliance World",
  date: "2025-10-20T14:30:00.000Z",
  created_at: "2025-10-20T14:30:00.000Z"
}
```

## Testing Your Setup

After adding data, verify everything works:

1. **Test the Dashboard:**
   ```bash
   npm run dev
   ```
   Navigate to: `http://localhost:3000/manager`

2. **Verify API Endpoints:**
   - GET expenses: `http://localhost:3000/api/expenses`
   - AI insights: `http://localhost:3000/api/ai/owner-insights`

3. **Test Adding an Expense:**
   - Click "Add Expense" button in the dashboard
   - Fill out the form
   - Submit and verify it appears in the table

4. **Test Report Generation:**
   - Click "Monthly Report" button
   - Verify CSV downloads
   - Check that it includes your sample expenses

## Troubleshooting

### "Missing or insufficient permissions" Error

**Solution:** Update your Firestore security rules to allow authenticated access (see Step 4 above).

### Indexes Required Error

**Solution:** Click the link in the error message to automatically create the required index, or manually create indexes as described in Step 5.

### Empty Dashboard

**Possible Causes:**
1. No data in Firestore → Add sample expenses
2. Firestore rules blocking access → Update security rules
3. Firebase config incorrect → Check `src/lib/firebase.ts`

### Date Format Issues

Always use ISO 8601 format for dates:
```javascript
date: new Date().toISOString() // "2025-11-01T12:30:00.000Z"
```

## Best Practices

1. **Always Include Timestamps:**
   - `date` - When the expense occurred
   - `created_at` - When the record was created

2. **Use Consistent Categories:**
   - Maintenance
   - Utilities
   - Insurance
   - Taxes
   - Misc

3. **Store Amounts as Numbers:**
   - ✅ `amount: 1200`
   - ❌ `amount: "$1,200.00"`

4. **Use Descriptive Vendor Names:**
   - ✅ "Cool Air HVAC Services"
   - ❌ "vendor1"

5. **Regular Backups:**
   - Use Firebase's automated backups
   - Export reports monthly for records

## Data Migration

If migrating from another system:

1. **Export your existing data** to CSV or JSON
2. **Transform data** to match the schema above
3. **Use Firebase Admin SDK** for bulk imports:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function importExpenses(expenses) {
  const batch = db.batch();
  
  expenses.forEach(expense => {
    const docRef = db.collection('expenses').doc();
    batch.set(docRef, expense);
  });
  
  await batch.commit();
}
```

## Next Steps

After setup:
1. ✅ Add authentication (Firebase Auth)
2. ✅ Customize property data
3. ✅ Set up OpenAI API for AI insights (optional)
4. ✅ Configure automated email reports
5. ✅ Add more properties to track

---

**Need Help?** Check the main [OWNER_DASHBOARD.md](./OWNER_DASHBOARD.md) for detailed documentation.

