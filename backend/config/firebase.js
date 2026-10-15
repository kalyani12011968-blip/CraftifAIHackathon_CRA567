const admin = require("firebase-admin");

let db = null;

try {
  const configured =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (configured && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      })
    });
    db = admin.firestore();
    console.log("Firebase Firestore initialized");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !admin.apps.length) {
    admin.initializeApp();
    db = admin.firestore();
    console.log("Firebase Firestore initialized via Application Default Credentials");
  } else {
    // Local development mode without Firebase
  }
} catch (error) {
  console.log("Firebase not connected. Using local JSON / database fallback:", error.message);
}

module.exports = {
  admin,
  db
};
