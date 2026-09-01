import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

try {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin. Please ensure firebase-service-account.json exists in the backend root directory.', error.message);
}

export default admin;
