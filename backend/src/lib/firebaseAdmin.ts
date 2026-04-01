import admin from 'firebase-admin';

let app: admin.app.App;

export function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set'
      );
    }

    // Parse the service account JSON string
    const serviceAccount = JSON.parse(serviceAccountJson);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully');
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export function getFirebaseAdmin() {
  if (!app) {
    return initializeFirebaseAdmin();
  }
  return app;
}

export const adminAuth = () => {
  const firebaseApp = getFirebaseAdmin();
  return firebaseApp.auth();
};

export const adminStorage = () => {
  const firebaseApp = getFirebaseAdmin();
  return firebaseApp.storage();
};

