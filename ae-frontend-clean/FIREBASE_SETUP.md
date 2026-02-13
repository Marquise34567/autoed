Firebase client setup
=====================

Required environment variables (prefix with `NEXT_PUBLIC_` in Vercel):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Where to find them:

- Open your Firebase Console → Project Settings → "General".
- The Web app configuration block contains the values above (API key, projectId, appId, etc.).

How to add to Vercel:

1. Go to your Vercel project settings.
2. Under "Environment Variables" add each key above (use the exact `NEXT_PUBLIC_...` names).
3. Deploy — the frontend will detect these at build/runtime.

Notes:

- The frontend intentionally does not include server-only credentials (service account/private key). Those belong to backend server environments only.
- If the Firebase client env vars are missing, the app will render a non-blocking banner and export null-safe Firebase objects to avoid runtime crashes.
