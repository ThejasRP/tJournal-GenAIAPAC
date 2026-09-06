require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  
  const db = admin.firestore();
  console.log("Firebase Admin initialized successfully.");
} catch (error) {
  console.error("Firebase Admin Error:", error);
}
