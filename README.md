# Next Level Rentals - Property Management Tenant Portal

A modern, user-friendly tenant portal and landing page for property management services, designed to streamline communication between property managers and tenants. The platform is powered by Firebase to deliver secure authentication, real-time data syncing, and scalable cloud infrastructure.

## 🏠 Overview

Next Level Rentals is a comprehensive property management system that provides tenants with easy access to essential services and property managers with efficient tools to manage their properties. The platform features a clean, intuitive interface with both a public landing page and a secure tenant portal backed by Firebase services.

## ✨ Features

### Landing Page
- **Modern Design**: Clean, responsive layout optimized for all devices
- **Property Showcase**: Featured properties with high-quality images and details
- **Service Overview**: Comprehensive list of property management services
- **Contact Information**: Easy-to-find contact details and inquiry forms
- **Testimonials**: Customer reviews and success stories
- **Call-to-Action**: Clear pathways for prospective tenants and property owners

### Tenant Portal
- **Secure Authentication**: Firebase Authentication with optional multi-factor support
- **Dashboard**: Personalized overview of account status and important notifications
- **Rent Management**:
  - Online rent payment processing
  - Payment history and receipts
  - Automatic payment setup
- **Maintenance Requests**:
  - Submit and track maintenance requests
  - Photo upload capability via Firebase Storage
  - Real-time status updates using Cloud Firestore
- **Communication Hub**:
  - Direct messaging with property managers
  - Important announcements and notifications
  - Document sharing capabilities
- **Lease Management**:
  - Access to lease documents
  - Renewal notifications and processes
  - Policy updates and amendments

## 🛠️ Technology Stack

- **Frontend**: React.js with modern UI components
- **Backend**: Firebase Cloud Functions (Node.js runtime)
- **Database**: Cloud Firestore for real-time data persistence
- **Authentication**: Firebase Authentication
- **Payment Processing**: Stripe integration triggered from Cloud Functions
- **File Storage**: Firebase Storage for documents and images
- **Email & Notifications**: SendGrid or Firebase Extensions triggered via Cloud Functions
- **Hosting**: Firebase Hosting with optional Cloud Run for server-side needs

## 📱 Responsive Design

The platform is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes and orientations

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- Firebase CLI (`npm install -g firebase-tools`)
- Access to a Firebase project (or create one at [console.firebase.google.com](https://console.firebase.google.com))

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/nxtlevelrentals.git
cd nxtlevelrentals
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Firebase and service configuration
```

4. Configure Firebase
- Login to Firebase: `firebase login`
- Set the active project: `firebase use <your-project-id>`
- Enable the following Firebase products in the console:
  - Authentication (Email/Password, SSO providers as needed)
  - Cloud Firestore
  - Firebase Storage
  - Cloud Functions (upgrade project to Blaze plan for external network calls such as Stripe)

5. Initialize the database and storage rules (optional but recommended)
```bash
firebase firestore:indexes && firebase deploy --only firestore:rules,storage:rules
```

6. Start the development server
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables
Update your `.env` file with the following keys:

The provided .env.example is prefilled with the rental-app-3ec4a Firebase web configuration. Override these values if you provision a different Firebase project.


- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase web API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket name
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Sender ID for Firebase Cloud Messaging (if used)
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase app ID
- `FIREBASE_CLIENT_EMAIL`: Service account client email for Firebase Admin SDK
- `FIREBASE_PRIVATE_KEY`: Service account private key (escape newlines when storing in `.env`)
- `FIREBASE_DATABASE_URL`: Realtime Database URL (if applicable)
- `STRIPE_PUBLIC_KEY`: Stripe publishable key for client-side usage
- `STRIPE_SECRET_KEY`: Stripe secret key for Cloud Functions
- `SENDGRID_API_KEY`: API key for transactional email (if using SendGrid)

> **Note:** Keep your service account credentials secure. For local development, you can store the Firebase Admin SDK JSON as a base64 string and decode it in your configuration.

## 📊 Features in Development

- **Mobile App**: Native iOS and Android applications
- **Property Analytics**: Advanced reporting and analytics dashboard
- **Smart Home Integration**: IoT device management
- **Virtual Property Tours**: 360° property viewing capabilities
- **AI-Powered Support**: Chatbot for common inquiries
- **Multi-language Support**: Internationalization features

## 🤝 Contributing

We welcome contributions to improve Next Level Rentals! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and inquiries:
- **Email**: support@nxtlevelrentals.com
- **Phone**: (555) 123-4567
- **Website**: https://nxtlevelrentals.com
- **Documentation**: https://docs.nxtlevelrentals.com

## 🎯 Roadmap

- [ ] Version 2.0 - Advanced Analytics Dashboard
- [ ] Mobile Application Launch
- [ ] Integration with Smart Home Devices
- [ ] Multi-property Management Tools
- [ ] Advanced Reporting Features
- [ ] API for Third-party Integrations

---

**Built with ❤️ by the Next Level Rentals Team**


### Role Seeding Script

Use `scripts/seed-roles.js` to create the required Firestore documents for your admin and tenant users. Install Firebase Admin locally (`npm install firebase-admin --save-dev`), then run:

```bash
node scripts/seed-roles.js path/to/serviceAccountKey.json
```

Update the placeholder UIDs in the script before executing it; the values should match the Firebase Authentication UIDs for your accounts. You can re-run the script any time you add new users.

