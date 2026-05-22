import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

// Skip Firebase entirely in mock mode — no valid credentials needed
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === 'true'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null

if (!MOCK_MODE) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  _auth = getAuth(_app)
}

// Cast to non-null: auth-context guards every usage behind `if (MOCK_MODE)` checks
export const auth = _auth as Auth
export default _app as FirebaseApp
