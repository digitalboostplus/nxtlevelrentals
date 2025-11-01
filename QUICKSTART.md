# 🚀 Quick Start Guide

Get your NXTLevel Rental Manager up and running in under 10 minutes!

## Step 1: Install Dependencies (1 minute)

```bash
npm install
```

## Step 2: Set Up Firebase (3 minutes)

### A. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project
3. Follow the setup wizard

### B. Get Your Firebase Config

1. In Firebase Console, click the **gear icon** → **Project settings**
2. Scroll down to **"Your apps"** → Click **Web icon (</>)**
3. Register your app (name: "NXTLevel Manager")
4. Copy the config values

### C. Create Environment File

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Step 3: Set Up Firestore (3 minutes)

### A. Enable Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select a location and click **"Enable"**

### B. Create `expenses` Collection

1. Click **"Start collection"**
2. Collection ID: `expenses`
3. Add a sample document:

| Field          | Type   | Value                         |
| -------------- | ------ | ----------------------------- |
| property_name  | string | 123 Main St                   |
| category       | string | Maintenance                   |
| description    | string | HVAC repair                   |
| amount         | number | 1200                          |
| vendor         | string | Cool Air HVAC                 |
| date           | string | 2025-10-15T10:00:00.000Z      |
| created_at     | string | 2025-10-15T10:00:00.000Z      |

4. Click **"Save"**

### C. Update Security Rules

1. Go to **Firestore Database** → **Rules**
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{expenseId} {
      allow read, write: if true;
    }
    match /properties/{propertyId} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

> **Note:** These are permissive rules for testing. Add authentication and restrict access in production!

## Step 4: (Optional) Set Up AI Insights (2 minutes)

If you want AI-powered insights:

1. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Add to your `.env.local`:

```env
OPENAI_API_KEY=sk-your-key-here
```

**Skip this step?** No problem! The dashboard will use smart fallback insights.

## Step 5: Run the App (1 minute)

```bash
npm run dev
```

Open your browser to:
- **Owner Dashboard:** [http://localhost:3000/manager](http://localhost:3000/manager)

## 🎉 You're Done!

You should see:
- ✅ Financial summary charts
- ✅ Your sample expense in the table
- ✅ AI-generated insights
- ✅ Property performance metrics

## What's Next?

### Add More Sample Data

Click the **"Add Expense"** button to add expenses through the UI, or add more directly in Firestore.

### Test Features

- ✅ **Add an expense** using the modal form
- ✅ **Generate a report** by clicking "Monthly Report"
- ✅ **View AI insights** in the top banner
- ✅ **Explore charts** showing income vs. expenses

### Customize Your Dashboard

1. **Add real property data** to the `PropertyPerformance` component
2. **Connect maintenance requests** (see [MAINTENANCE_PORTAL.md](./MAINTENANCE_PORTAL.md))
3. **Set up authentication** (Firebase Auth)
4. **Configure email reports** for automated monthly summaries

## Common Issues

### "Cannot find module" errors
```bash
npm install
```

### Dashboard shows no data
- Check that your expense document exists in Firestore
- Verify `.env.local` has correct Firebase credentials
- Check browser console for errors

### Charts not displaying
- Make sure `recharts` is installed: `npm install recharts`
- Clear browser cache and refresh

### AI insights not working
- Verify `OPENAI_API_KEY` is set (or ignore - fallback works fine!)
- Check OpenAI API quota/billing

## Need More Help?

- 📖 **Full Documentation:** [OWNER_DASHBOARD.md](./OWNER_DASHBOARD.md)
- 🔥 **Database Setup:** [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md)
- 🔧 **Maintenance Portal:** [MAINTENANCE_PORTAL.md](./MAINTENANCE_PORTAL.md)

## Next Steps

Once you're comfortable with the basics:

1. ✅ Add authentication with Firebase Auth
2. ✅ Secure Firestore with proper rules
3. ✅ Add your real property portfolio
4. ✅ Customize expense categories
5. ✅ Set up Stripe for tenant payments
6. ✅ Deploy to Vercel or Firebase Hosting

---

**Pro Tip:** Check out the [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for 8+ sample expenses to populate your dashboard with realistic data!

Happy property managing! 🏡

