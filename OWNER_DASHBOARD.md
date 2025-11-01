# 🏢 Owner / Manager Dashboard - Implementation Guide

## Overview

The Owner/Manager Dashboard is a comprehensive administrative interface for property owners and managers to monitor financial performance, track expenses, manage maintenance, and analyze portfolio health with AI-powered insights.

## 📁 Project Structure

```
src/
├── app/
│   ├── manager/
│   │   ├── page.tsx                    # Main dashboard page
│   │   └── components/
│   │       ├── FinancialSummary.tsx    # Income/expense charts & metrics
│   │       ├── ExpenseTable.tsx        # Recent expenses table
│   │       ├── MaintenanceOverview.tsx # Maintenance stats & charts
│   │       ├── PropertyPerformance.tsx # Property occupancy & rent
│   │       ├── AIInsightsCard.tsx      # AI-generated insights
│   │       ├── AddExpenseModal.tsx     # Add expense form modal
│   │       └── ReportsCard.tsx         # Report generation & export
│   └── api/
│       ├── expenses/
│       │   └── route.ts                # GET & POST expenses
│       ├── ai/
│       │   └── owner-insights/
│       │       └── route.ts            # AI insights generation
│       └── reports/
│           ├── monthly/
│           │   └── route.ts            # Monthly CSV report
│           └── ytd/
│               └── route.ts            # Year-to-date CSV report
```

## 🔥 Firestore Schema

### Collections

#### **expenses**
```typescript
{
  expense_id: string,           // Auto-generated document ID
  property_name: string,        // Property address/identifier
  category: "Maintenance" | "Utilities" | "Insurance" | "Taxes" | "Misc",
  description: string,          // Expense details
  amount: number,               // Dollar amount
  vendor: string,               // Vendor/service provider name
  date: string,                 // ISO timestamp
  created_at: string            // ISO timestamp
}
```

#### **properties** (Recommended for full implementation)
```typescript
{
  property_id: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  units: number,
  owner_id: string,
  manager_id: string,
  total_income_ytd: number,
  total_expenses_ytd: number,
  occupancy_rate: number,
  monthly_rent: number,
  active_leases: number
}
```

#### **vendors** (Optional)
```typescript
{
  vendor_id: string,
  name: string,
  contact_name: string,
  phone: string,
  email: string,
  category: string,
  rating: number
}
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `recharts` - For charts and data visualization
- All existing dependencies (Next.js, Firebase, etc.)

### 2. Firebase Setup

Ensure your Firebase configuration is set up in `src/lib/firebase.ts` with proper environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Create Firestore Collections

In your Firebase Console:

1. Go to **Firestore Database**
2. Create the following collections:
   - `expenses`
   - `properties` (optional, for future expansion)
   - `vendors` (optional)

**Firestore Security Rules Example:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Expenses collection
    match /expenses/{expenseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Properties collection
    match /properties/{propertyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Vendors collection
    match /vendors/{vendorId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. (Optional) Set Up OpenAI API for AI Insights

For AI-powered portfolio insights, add your OpenAI API key to `.env.local`:

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

**Note:** If no API key is provided, the system will use rule-based fallback insights.

### 5. Run Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000/manager`

## 🎨 Design System

The dashboard follows the NueSynergy branding guidelines:

- **Primary Color:** Deep Blue (#1E4E6B) - Headers, primary buttons
- **Accent Color:** Lime Green (#A4C639) - CTAs, highlights
- **Background:** Light gradients (#f0f4f8 to #e8f2f6)
- **Cards:** White with subtle shadows
- **Text:** 
  - Primary: #2d3748
  - Secondary: #64748b

## 📊 Key Features

### 1. Financial Summary
- Monthly income vs. expense charts
- Year-to-date totals
- Expense-to-income ratio tracking
- Visual bar charts using Recharts

### 2. Expense Management
- Add expenses via modal form
- Categorized expense tracking
- Searchable expense table
- Real-time updates

### 3. Maintenance Overview
- Pending, in-progress, and completed requests
- Average resolution time
- Total maintenance spend (YTD)
- Cost breakdown by category
- Visual pie charts for status distribution

### 4. Property Performance
- Overall portfolio occupancy rate
- Individual property metrics
- Monthly rent revenue
- Upcoming vacancy alerts
- Visual occupancy bars

### 5. AI Insights
- Automated portfolio analysis
- Expense trend identification
- Actionable recommendations
- Powered by OpenAI (with fallback)

### 6. Reporting & Export
- Monthly financial reports (CSV)
- Year-to-date reports (CSV)
- Downloadable for tax purposes
- Automated email scheduling (coming soon)

## 🔌 API Endpoints

### GET `/api/expenses`
Fetch all expenses (ordered by date, limited to 50)

**Response:**
```json
[
  {
    "expense_id": "abc123",
    "property_name": "123 Main St",
    "category": "Maintenance",
    "description": "HVAC repair",
    "amount": 450.00,
    "vendor": "ABC HVAC Services",
    "date": "2025-10-15T10:30:00.000Z"
  }
]
```

### POST `/api/expenses`
Add a new expense

**Request Body:**
```json
{
  "category": "Maintenance",
  "property_name": "123 Main St",
  "description": "Plumbing repair - leak fix",
  "amount": "325.50",
  "vendor": "Quick Plumbing Co"
}
```

### GET `/api/ai/owner-insights`
Generate AI-powered portfolio insights

**Response:**
```json
{
  "summary": "Your portfolio is performing well with a 32.5% expense ratio. Top expense areas are HVAC, Plumbing, Electrical. You're generating $16,300 in net profit this period."
}
```

### GET `/api/reports/monthly`
Download monthly financial report (CSV)

### GET `/api/reports/ytd`
Download year-to-date financial report (CSV)

## 🎯 Key Performance Indicators (KPIs)

| Metric                  | Description                 | Target |
| ----------------------- | --------------------------- | ------ |
| Rent Collection Rate    | % of rent collected on time | 95%+   |
| Expense-to-Income Ratio | Total expenses / income     | < 40%  |
| Avg. Maintenance Cost   | Mean cost per unit/month    | < $150 |
| Vacancy Rate            | % of units unoccupied       | < 5%   |
| Avg. Resolution Time    | Days to resolve maintenance | < 5d   |

## 🔮 Future Enhancements

- [ ] Integrate Stripe for real-time rent collection tracking
- [ ] Add property-specific drill-down views
- [ ] Implement automated email reports (monthly summaries)
- [ ] Add vendor performance tracking and ratings
- [ ] Create mobile-responsive layouts
- [ ] Add lease renewal reminders
- [ ] Implement multi-property filtering
- [ ] Add predictive maintenance alerts using AI
- [ ] Create tenant communication portal integration
- [ ] Add document storage for receipts and invoices

## 🐛 Troubleshooting

### Expenses Not Loading
1. Check Firebase configuration in `src/lib/firebase.ts`
2. Verify Firestore security rules allow read access
3. Ensure `expenses` collection exists in Firestore
4. Check browser console for errors

### AI Insights Not Working
1. Verify `OPENAI_API_KEY` is set in `.env.local`
2. Check OpenAI API quota/billing
3. System will fall back to rule-based insights if API fails

### Charts Not Rendering
1. Ensure `recharts` is installed: `npm install recharts`
2. Check for JavaScript errors in browser console
3. Verify data format matches component expectations

### Reports Not Downloading
1. Check browser pop-up blocker settings
2. Ensure expenses exist in Firestore for the period
3. Check API route logs for errors

## 📝 Sample Data for Testing

To populate your dashboard with sample data, add these documents to Firestore:

**Expenses Collection:**
```javascript
// Document 1
{
  property_name: "123 Main St, Apt 201",
  category: "Maintenance",
  description: "HVAC compressor replacement",
  amount: 1200.00,
  vendor: "Cool Air HVAC",
  date: "2025-10-05T14:30:00.000Z",
  created_at: "2025-10-05T14:30:00.000Z"
}

// Document 2
{
  property_name: "456 Oak Ave",
  category: "Utilities",
  description: "Water bill - October",
  amount: 85.50,
  vendor: "City Water Dept",
  date: "2025-10-01T09:00:00.000Z",
  created_at: "2025-10-01T09:00:00.000Z"
}

// Document 3
{
  property_name: "789 Pine Blvd",
  category: "Maintenance",
  description: "Plumbing leak repair",
  amount: 325.00,
  vendor: "24/7 Plumbing",
  date: "2025-10-12T11:15:00.000Z",
  created_at: "2025-10-12T11:15:00.000Z"
}
```

## 🤝 Contributing

When adding new features:
1. Follow the existing component structure
2. Use the NueSynergy color palette
3. Add TypeScript types for all props
4. Include error handling in API routes
5. Update this documentation

## 📧 Support

For questions or issues, please refer to the main project README or contact the development team.

---

**Version:** 1.0  
**Last Updated:** November 1, 2025  
**Built with:** Next.js 16, React 19, Firebase, Recharts, TypeScript

