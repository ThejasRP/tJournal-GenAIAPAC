# tJournal

An AI-powered journaling application utilizing Next.js (App Router), Firebase, and Google Cloud Run. Features include Voice Logging, Catharsis Mode, CBT Clarity Lens, Time Capsules, and Google Workspace Sync.

## Architecture
- **Frontend**: Next.js 16 (React, TailwindCSS, Framer Motion)
- **Database/Auth**: Firebase Firestore & Firebase Authentication
- **AI Backend**: `@google/genai` (Gemini Flash 3.6 & 3.1 fallback ladder)
- **Deployment**: Google Cloud Run

## Prerequisites

1. Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`).
2. Have a Firebase project initialized.
3. Enable the following APIs in your Google Cloud Console:
   - Secret Manager API
   - Cloud Run API
   - Cloud Firestore API
   - Generative Language API

## Secret Management Setup

Do not hardcode API keys! We use Google Cloud Secret Manager to securely store the `GEMINI_API_KEY`.

1. **Create and populate the secret:**
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

2. **Grant the Cloud Run service account access to read the secret:**
```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Database Security Configuration (Firestore)

We employ strict, owner-bound security rules to ensure user data isolation. Never use `allow read, write: if true;`.

Deploy the following `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated User Documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Journal Entries Collection
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Time Capsules Collection
      match /capsules/{capsuleId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Sync Tokens
      match /tokens/{tokenId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

## Cloud Run Deployment Flow

Ensure your Next.js application is configured for `standalone` output in `next.config.js`.

Deploy using the following command, binding the secret dynamically:

```bash
gcloud run deploy tjournal-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --env-vars-file=.env.yaml
```

### Required Campaign Labeling
To register the service for automated challenge verification, apply the mandatory label:

```bash
gcloud run services update tjournal-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

## Security Posture
- **No Hardcoding**: All secrets are pulled via GCP Secret Manager (`src/lib/secrets.ts`).
- **Authorization**: API endpoints securely verify Firebase JWT tokens via Firebase Admin SDK (`adminAuth.verifyIdToken()`).
- **Resiliency**: Gemini calls utilize a multi-model fallback ladder (`gemini-3.6-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.7-flash`).
- **Payload Hygiene**: Strict `undefined` stripping ensures Firebase write streams never crash.
