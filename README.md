# 🏠 NXTLevel Rental Manager

A comprehensive property management platform built with Next.js, Firebase, and AI-powered insights. Designed for property owners, managers, and tenants to streamline rental operations, financial tracking, and maintenance management.

## ✨ Features

### 🏢 Owner / Manager Dashboard
- **Financial Tracking** - Real-time income vs. expense monitoring with visual charts
- **Expense Management** - Categorized expense tracking with vendor information
- **Property Performance** - Occupancy rates, rent collection, and vacancy alerts
- **Maintenance Overview** - Track pending, in-progress, and completed maintenance requests
- **AI-Powered Insights** - Automated portfolio analysis and recommendations
- **Report Generation** - Downloadable monthly and year-to-date financial reports (CSV)

### 🔧 Maintenance Portal (Coming Soon)
- Tenant maintenance request submission
- Real-time status tracking
- Vendor assignment and management

### 💳 Tenant Portal (Coming Soon)
- Online rent payments via Stripe
- Lease document access
- Maintenance request tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase account
- (Optional) OpenAI API key for AI insights

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd nxtlevelrentalmanager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Optional: OpenAI for AI Insights
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

4. **Set up Firestore:**
   
   Follow the detailed guide in [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) to:
   - Create required collections
   - Configure security rules
   - Add sample data for testing

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   - Main site: [http://localhost:3000](http://localhost:3000)
   - Owner Dashboard: [http://localhost:3000/manager](http://localhost:3000/manager)
   - Maintenance Portal: [http://localhost:3000/maintenance](http://localhost:3000/maintenance)

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── manager/                 # Owner dashboard
│   │   ├── page.tsx
│   │   └── components/
│   ├── maintenance/             # Maintenance portal
│   │   └── page.tsx
│   └── api/                     # API routes
│       ├── expenses/
│       ├── ai/
│       └── reports/
├── lib/
│   └── firebase.ts              # Firebase configuration
└── globals.css                  # Global styles
```

## 📖 Documentation

- **[OWNER_DASHBOARD.md](./OWNER_DASHBOARD.md)** - Complete owner dashboard documentation
- **[FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md)** - Database setup guide
- **[MAINTENANCE_PORTAL.md](./MAINTENANCE_PORTAL.md)** - Maintenance portal documentation

## 🎨 Design System

Following NueSynergy branding guidelines:
- **Primary:** Deep Blue (#1E4E6B)
- **Accent:** Lime Green (#A4C639)
- **Backgrounds:** Light gradients (#f0f4f8 to #e8f2f6)
- **Text:** Primary (#2d3748), Secondary (#64748b)

## 🔑 Key Technologies

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Charts:** Recharts
- **AI:** OpenAI GPT-4o-mini (optional)
- **Language:** TypeScript

## 📊 API Endpoints

| Endpoint                      | Method | Description                    |
| ----------------------------- | ------ | ------------------------------ |
| `/api/expenses`               | GET    | Fetch all expenses             |
| `/api/expenses`               | POST   | Add new expense                |
| `/api/ai/owner-insights`      | GET    | Get AI portfolio insights      |
| `/api/reports/monthly`        | GET    | Download monthly report (CSV)  |
| `/api/reports/ytd`            | GET    | Download YTD report (CSV)      |

## 🧪 Testing

Add sample data to Firestore using the examples in [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md), then:

1. Visit `http://localhost:3000/manager`
2. View financial charts and metrics
3. Click "Add Expense" to test expense creation
4. Generate monthly/YTD reports
5. View AI-generated insights

## 🚧 Roadmap

- [x] Owner/Manager Dashboard
- [x] Financial tracking and reporting
- [x] AI-powered insights
- [ ] Firebase Authentication integration
- [ ] Tenant portal with rent payments
- [ ] Stripe integration for payments
- [ ] Email notifications and automated reports
- [ ] Mobile-responsive optimizations
- [ ] Lease management system
- [ ] Multi-user roles and permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 💬 Support

For questions or issues, please refer to the documentation files or create an issue in the repository.

---

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
