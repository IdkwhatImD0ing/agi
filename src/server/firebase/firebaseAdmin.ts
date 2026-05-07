import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { env } from '~/server/env.server';


const FIREBASE_ADMIN_APP_NAME = 'big-agi-admin';


function parseServiceAccount(jsonString: string): ServiceAccount {
  let serviceAccount: any;

  try {
    serviceAccount = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.', { cause: error });
  }

  const projectId = serviceAccount.project_id ?? serviceAccount.projectId;
  const clientEmail = serviceAccount.client_email ?? serviceAccount.clientEmail;
  const privateKey = (serviceAccount.private_key ?? serviceAccount.privateKey)?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey)
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must include project_id, client_email, and private_key.');

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function getFirebaseAdminFirestore(): Firestore {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON)
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required for admin user management.');

  const existingApp = getApps().find(app => app.name === FIREBASE_ADMIN_APP_NAME);
  const app = existingApp ?? initializeApp({
    credential: cert(parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
  }, FIREBASE_ADMIN_APP_NAME);

  return getFirestore(app);
}
