# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Landing Page (/)                Owner Dashboard (/manager)      │
│  ├─ Hero Section                 ├─ FinancialSummary            │
│  ├─ Features                     ├─ PropertyPerformance         │
│  ├─ Testimonials                 ├─ MaintenanceOverview         │
│  └─ Navigation                   ├─ ExpenseTable                │
│                                  ├─ AIInsightsCard              │
│  Maintenance Portal              ├─ AddExpenseModal             │
│  (/maintenance)                  └─ ReportsCard                 │
│  ├─ Request Form                                                 │
│  └─ Status Tracking                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTES LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api/expenses                    /api/reports                   │
│  ├─ GET  (List expenses)          ├─ /monthly (CSV)             │
│  └─ POST (Add expense)            └─ /ytd (CSV)                 │
│                                                                   │
│  /api/ai/owner-insights                                          │
│  └─ GET (AI analysis)                                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Firestore Database               Firebase Auth (future)         │
│  ├─ expenses                      ├─ User authentication        │
│  ├─ properties                    └─ Role-based access          │
│  └─ vendors                                                      │
│                                   Firebase Storage (future)      │
│  Security Rules                   └─ Receipt uploads            │
│  └─ Role-based access                                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  OpenAI API                       Stripe (future)                │
│  └─ GPT-4o-mini                   ├─ Payment processing         │
│     ├─ Portfolio insights         └─ Subscription management    │
│     └─ Expense analysis                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Adding an Expense

```
User clicks "Add Expense"
    ↓
AddExpenseModal opens
    ↓
User fills form & submits
    ↓
POST /api/expenses
    ↓
Firestore: Add document to 'expenses' collection
    ↓
Return success
    ↓
ExpenseTable refreshes
    ↓
New expense appears in table
```

### 2. Viewing Dashboard

```
User navigates to /manager
    ↓
Dashboard page loads
    ↓
Parallel API calls:
    ├─ GET /api/expenses → ExpenseTable
    ├─ GET /api/ai/owner-insights → AIInsightsCard
    └─ Mock data → FinancialSummary, PropertyPerformance, MaintenanceOverview
    ↓
Components render with data
    ↓
User sees complete dashboard
```

### 3. Generating Report

```
User clicks "Monthly Report" or "YTD Report"
    ↓
GET /api/reports/monthly or /api/reports/ytd
    ↓
API fetches data from Firestore
    ↓
Generate CSV content
    ↓
Return CSV file
    ↓
Browser downloads file
```

---

## Component Hierarchy

```
page.tsx (Manager Dashboard)
│
├─ AIInsightsCard
│   └─ Fetches from /api/ai/owner-insights
│
├─ FinancialSummary
│   ├─ Receives: { data: FinancialData[] }
│   └─ Renders: Bar chart (Recharts)
│
├─ ReportsCard
│   ├─ Monthly Report button
│   └─ YTD Report button
│
├─ PropertyPerformance
│   ├─ Portfolio overview cards
│   └─ Individual property cards
│
├─ MaintenanceOverview
│   ├─ Status distribution (Pie chart)
│   └─ Category breakdown
│
├─ ExpenseTable
│   ├─ Fetches from /api/expenses
│   └─ Displays expense rows
│
└─ AddExpenseModal
    ├─ Form inputs
    └─ POST to /api/expenses
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Icons:** FontAwesome
- **Language:** TypeScript

### Backend
- **Runtime:** Node.js
- **API Routes:** Next.js API Routes
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth (to be implemented)
- **Storage:** Firebase Storage (to be implemented)

### External Services
- **AI:** OpenAI GPT-4o-mini (optional)
- **Payments:** Stripe (future integration)
- **Email:** SendGrid/Mailgun (future integration)

---

## Security Architecture

### Current State (Development)

```
User → Next.js App → Firestore
                      └─ Test mode (permissive rules)
```

### Production Architecture (Recommended)

```
User → Next.js App → Firebase Auth → Authorized Access → Firestore
                      │                                    └─ Secure rules
                      │
                      └─ JWT Token → API Routes → Verify Auth → Database
```

### Firestore Security Rules (Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Expenses - users can only access their own
    match /expenses/{expenseId} {
      allow read: if isSignedIn() && 
                     resource.data.owner_id == request.auth.uid;
      allow create: if isSignedIn() && 
                       request.resource.data.owner_id == request.auth.uid;
      allow update, delete: if isSignedIn() && 
                               resource.data.owner_id == request.auth.uid;
    }
    
    // Properties - users can only access properties they own/manage
    match /properties/{propertyId} {
      allow read: if isSignedIn() && (
                     resource.data.owner_id == request.auth.uid ||
                     resource.data.manager_id == request.auth.uid
                  );
      allow write: if isSignedIn() && 
                      resource.data.owner_id == request.auth.uid;
    }
  }
}
```

---

## API Design Patterns

### RESTful Endpoints

All API routes follow REST conventions:

- **GET** - Retrieve data
- **POST** - Create new resources
- **PUT/PATCH** - Update resources (future)
- **DELETE** - Remove resources (future)

### Error Handling

```typescript
try {
  // Operation
  return NextResponse.json({ success: true, data });
} catch (error) {
  console.error("Error:", error);
  return NextResponse.json(
    { error: "Descriptive error message" },
    { status: 500 }
  );
}
```

### Response Format

```typescript
// Success
{
  "success": true,
  "data": [...],
  "message": "Optional message"
}

// Error
{
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

---

## State Management

### Client-Side State

Currently using **React hooks** for local state:

- `useState` - Component state
- `useEffect` - Side effects and data fetching
- Props - Parent-child communication

### Future Considerations

For complex state management, consider:

- **Zustand** - Lightweight state management
- **React Query** - Server state caching
- **Context API** - Global state (auth, theme)

---

## Performance Optimizations

### Current Optimizations

1. **Code Splitting** - Next.js automatic code splitting
2. **Image Optimization** - Next.js Image component (future)
3. **Lazy Loading** - Components load on-demand
4. **Memoization** - React.memo for expensive components (to add)

### Future Optimizations

1. **React Query** - Cache API responses
2. **Incremental Static Regeneration** - Pre-render pages
3. **CDN Caching** - Static assets via Vercel Edge Network
4. **Database Indexing** - Firestore composite indexes

---

## Deployment Architecture

### Development

```
Local Machine → npm run dev → http://localhost:3000
                └─ Hot Module Replacement (HMR)
```

### Production (Vercel)

```
GitHub Repository
    ↓ (Push to main)
Vercel CI/CD Pipeline
    ├─ Build Next.js app
    ├─ Run tests (future)
    └─ Deploy to Edge Network
    ↓
Production URL (nxtlevel.vercel.app)
    └─ Global CDN distribution
```

### Environment Variables

**Development (.env.local)**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=dev-key
OPENAI_API_KEY=sk-dev-key
```

**Production (Vercel)**
```
Environment Variables configured in Vercel dashboard
├─ NEXT_PUBLIC_FIREBASE_API_KEY
├─ NEXT_PUBLIC_FIREBASE_PROJECT_ID
└─ OPENAI_API_KEY (secret, not exposed to client)
```

---

## Monitoring & Analytics

### To Implement

1. **Error Tracking**
   - Sentry or LogRocket
   - Track JavaScript errors
   - Monitor API failures

2. **Performance Monitoring**
   - Vercel Analytics
   - Web Vitals tracking
   - API response times

3. **User Analytics**
   - Google Analytics 4
   - Mixpanel or Amplitude
   - User behavior tracking

4. **Firebase Analytics**
   - User engagement
   - Feature usage
   - Retention metrics

---

## Testing Strategy

### Recommended Testing Pyramid

```
        /\
       /  \      E2E Tests (5%)
      /____\     - Playwright
     /      \    - Cypress
    /        \   
   /   Unit   \  Integration Tests (15%)
  /   Tests   \ - React Testing Library
 /    (80%)    \
/______________\ Unit Tests (80%)
                - Jest + React Testing Library
                - Component tests
                - API route tests
```

### Test Files Structure

```
src/
├─ app/
│  └─ manager/
│     ├─ __tests__/
│     │  └─ page.test.tsx
│     └─ components/
│        └─ __tests__/
│           ├─ FinancialSummary.test.tsx
│           └─ ExpenseTable.test.tsx
└─ lib/
   └─ __tests__/
      └─ firebase.test.ts
```

---

## Scalability Considerations

### Current Capacity

- **Users:** Unlimited (serverless architecture)
- **Database:** Firestore auto-scales
- **API Calls:** Vercel serverless functions (no limits on Pro plan)

### Bottlenecks to Monitor

1. **Firestore Reads/Writes** - Optimize queries, add indexes
2. **API Rate Limits** - OpenAI API quota
3. **Client-Side Rendering** - Large datasets in tables

### Scaling Solutions

1. **Pagination** - Limit results per page
2. **Virtual Scrolling** - For large tables
3. **Data Aggregation** - Pre-calculate metrics
4. **Caching** - Redis for frequently accessed data

---

## File Structure Best Practices

```
src/
├─ app/                      # Next.js App Router
│  ├─ api/                   # API routes
│  │  ├─ expenses/
│  │  ├─ ai/
│  │  └─ reports/
│  ├─ manager/               # Owner dashboard
│  │  ├─ page.tsx
│  │  └─ components/
│  ├─ maintenance/           # Tenant portal
│  └─ layout.tsx             # Root layout
│
├─ lib/                      # Shared utilities
│  ├─ firebase.ts            # Firebase config
│  ├─ utils.ts               # Helper functions
│  └─ types.ts               # TypeScript types
│
├─ components/               # Shared components (future)
│  ├─ Button.tsx
│  └─ Card.tsx
│
└─ hooks/                    # Custom React hooks (future)
   ├─ useAuth.ts
   └─ useFirestore.ts
```

---

## CI/CD Pipeline

### GitHub Actions (Future)

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run lint
      - run: npm run test
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: vercel deploy --prod
```

---

## Conclusion

This architecture provides:

✅ **Scalability** - Serverless, auto-scaling infrastructure  
✅ **Security** - Firebase Auth + Firestore rules  
✅ **Performance** - Edge CDN, code splitting  
✅ **Maintainability** - Clean separation of concerns  
✅ **Extensibility** - Easy to add new features  

**Next Steps:** Implement authentication and secure Firestore rules before production deployment.

---

*For implementation details, see [OWNER_DASHBOARD.md](./OWNER_DASHBOARD.md)*

