
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '@/../serviceAccountKey.json';

// Type assertion for service account credentials
const serviceAccountCert = {
  projectId: serviceAccount.project_id,
  clientEmail: serviceAccount.client_email,
  privateKey: serviceAccount.private_key,
};

let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccountCert),
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db };
