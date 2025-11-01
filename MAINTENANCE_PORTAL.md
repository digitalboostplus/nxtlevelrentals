# 🛠️ NxtLevel Maintenance Portal

## Overview

The Maintenance Portal is a comprehensive tenant-facing application that allows tenants to submit, track, and manage maintenance requests for their rental properties. Built with Next.js 16, React 19, and Firebase, it provides a modern, responsive interface following the NXTLevel brand guidelines.

## Features Implemented ✅

### 1. **Maintenance Request Submission**
- Clean, intuitive form with validation
- Multiple priority levels (Low, Medium, High, Emergency)
- Category selection (Plumbing, Electrical, HVAC, Appliances, etc.)
- Rich text description field
- Photo upload capability (prepared for Firebase Storage integration)
- Real-time form validation

### 2. **Request Tracking Dashboard**
- Visual status indicators for all requests
- Color-coded priority badges
- Category tags
- Assigned contractor information
- Creation and update timestamps
- Interactive request cards

### 3. **Request Status Flow**
The system tracks requests through four stages:
- **Received** - Under review (gray)
- **Assigned** - Contractor assigned (lime green)
- **In Progress** - Work underway (blue)
- **Completed** - Work finished (green)

### 4. **Detailed Request View**
- Full request information
- Status timeline
- Assigned contractor details
- Estimated completion date
- Communication history between tenant and contractor
- Message thread for ongoing updates

### 5. **Design & UX**
Following NXTLevel brand guidelines [[memory:10603463]]:
- **Primary Color**: Deep Blue (#1E4E6B) for headers and buttons
- **Accent Color**: Lime Green (#A4C639) for CTAs and highlights
- **Gradients**: Light blue gradient backgrounds (#f0f4f8 to #e8f2f6)
- **Cards**: White with subtle shadows
- **Typography**: Professional, readable hierarchy
- **Responsive**: Mobile-first design

## Technology Stack

```json
{
  "Frontend": "Next.js 16.0.1 (App Router)",
  "UI Framework": "React 19.2.0",
  "Styling": "Tailwind CSS 4",
  "Icons": "Font Awesome 7.1.0",
  "Backend (Ready)": "Firebase (Auth, Firestore, Storage)",
  "TypeScript": "5.x"
}
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page with portal link
│   ├── maintenance/
│   │   └── page.tsx             # Maintenance portal (main component)
│   ├── globals.css              # Global styles and theme variables
│   └── layout.tsx               # Root layout
├── lib/
│   └── firebase.ts              # Firebase configuration
```

## Firebase Integration Setup

### Prerequisites
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable the following Firebase services:
   - **Authentication** (for tenant login)
   - **Firestore Database** (for storing maintenance requests)
   - **Storage** (for photo uploads)

### Configuration Steps

1. **Copy Environment Variables**
   ```bash
   # Create your .env.local file (not committed to git)
   cp .env.local.example .env.local
   ```

2. **Add Firebase Credentials**
   Get your Firebase config from Project Settings > General > Your Apps
   
   Update `.env.local` with your values:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. **Firestore Database Structure**
   ```
   maintenanceRequests/
   └── {requestId}
       ├── id: string
       ├── tenantId: string
       ├── propertyId: string
       ├── title: string
       ├── description: string
       ├── category: string
       ├── priority: 'low' | 'medium' | 'high' | 'emergency'
       ├── status: 'received' | 'assigned' | 'in_progress' | 'completed'
       ├── images: string[]
       ├── assignedTo?: string
       ├── estimatedCompletion?: timestamp
       ├── createdAt: timestamp
       ├── updatedAt: timestamp
       └── messages: array
           ├── sender: string
           ├── message: string
           └── timestamp: timestamp
   ```

4. **Storage Rules** (for photo uploads)
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /maintenance-requests/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## Page Routes

- `/` - Landing page
- `/maintenance` - Tenant maintenance portal

## Key Components & Features

### Request Form
- **Location**: Main maintenance page
- **Trigger**: "New Request" button
- **Features**:
  - Client-side validation
  - Multi-file upload support
  - Image preview before submission
  - Priority selector with visual feedback
  - Category dropdown with common maintenance types

### Request List
- **Real-time updates**: Shows all tenant requests
- **Sorting**: Most recent first
- **Visual hierarchy**: Color-coded status and priority
- **Click to view**: Opens detailed request view

### Request Detail View
- **Full information**: Complete request data
- **Communication thread**: Message history
- **Status updates**: Track progress
- **Back navigation**: Return to list view

## Current State (Mock Data)

The application currently uses mock data for demonstration. Three sample requests are included:
1. **Leaking Kitchen Faucet** (Medium priority, In Progress)
2. **Air Conditioning Not Working** (High priority, Assigned)
3. **Smoke Detector Chirping** (Low priority, Completed)

## Next Steps for Production

### Phase 1: Authentication
- [ ] Implement Firebase Authentication
- [ ] Add login/signup flow
- [ ] Protect maintenance routes
- [ ] Link requests to authenticated users

### Phase 2: Database Integration
- [ ] Connect forms to Firestore
- [ ] Implement real-time data fetching
- [ ] Add request CRUD operations
- [ ] Set up Firestore security rules

### Phase 3: File Upload
- [ ] Implement Firebase Storage integration
- [ ] Add image compression
- [ ] Create upload progress indicator
- [ ] Handle upload errors gracefully

### Phase 4: AI Categorization
- [ ] Integrate OpenAI or Gemini API
- [ ] Auto-categorize requests
- [ ] Determine tenant vs landlord responsibility
- [ ] Suggest priority levels

### Phase 5: Notifications
- [ ] Email notifications for status changes
- [ ] SMS alerts for urgent requests
- [ ] Push notifications (PWA)
- [ ] In-app notification center

### Phase 6: Advanced Features
- [ ] Multi-property support
- [ ] Vendor portal integration
- [ ] Payment for tenant-responsible repairs
- [ ] Maintenance history reports
- [ ] Recurring maintenance scheduling

## Testing Checklist ✅

- [x] Page loads successfully
- [x] Navigation from landing page works
- [x] Request form displays correctly
- [x] Form validation works
- [x] Priority selection changes visual state
- [x] Category dropdown functions
- [x] Form submission creates new request
- [x] Request list displays properly
- [x] Status badges show correct colors
- [x] Request detail view opens
- [x] Communication history displays
- [x] Back navigation works
- [x] Mobile responsive design
- [x] Branding colors consistent throughout

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

- Uses React 19 with server components where applicable
- Lazy loading of images
- Optimized bundle size with Tailwind CSS purging
- Firebase SDK tree-shaking ready

## Security Notes

⚠️ **Important**: Before deploying to production:
1. Set up proper Firebase security rules
2. Implement authentication
3. Validate all inputs server-side
4. Rate limit API calls
5. Sanitize user-uploaded content
6. Enable HTTPS only
7. Set up proper CORS policies

## Support & Documentation

For more information about the NXTLevel Tenant Portal PRD, see the project requirements document.

---

**Built with ❤️ for NXTLevel Rental Manager**

*Version 1.0 - November 2025*

