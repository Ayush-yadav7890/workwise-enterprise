# WorkWise Enterprise — Complete Deployment Guide

## What You're Deploying
A full-stack React web application with:
- Firebase Authentication (Email/Password + Google Sign-In)
- Anthropic Claude AI backend
- Document upload and processing
- Professional enterprise UI

---

## STEP 1 — Set Up Firebase (Authentication)

### 1.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `workwise-enterprise`
3. Disable Google Analytics (optional) → **Create project**

### 1.2 Enable Authentication
1. In sidebar → **Authentication** → **Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password** → Save
4. Enable **Google** → add your support email → Save

### 1.3 Get Your Config Keys
1. Go to ⚙️ **Project Settings** (gear icon, top left)
2. Scroll to **"Your apps"** → Click **</>** (Web app)
3. Register app name: `workwise-web` → **Register app**
4. Copy the `firebaseConfig` object — you'll need it in Step 3

---

## STEP 2 — Get Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up / Log in
3. Go to **API Keys** → **Create Key**
4. Name it `workwise-production` → Copy the key (starts with `sk-ant-`)

> ⚠️  SECURITY WARNING: In production, never expose your Anthropic API key
> in the frontend. Use a backend proxy (see Step 6 — Advanced).

---

## STEP 3 — Configure the App

### 3.1 Update Firebase Config
Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",           // from Firebase console
  authDomain: "myapp.firebaseapp.com",
  projectId: "myapp-12345",
  storageBucket: "myapp.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abc123",
};
```

### 3.2 Create .env file
In the project root, create a file called `.env`:

```
REACT_APP_ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

---

## STEP 4 — Install & Test Locally

```bash
# Navigate to project folder
cd workwise-enterprise

# Install dependencies
npm install

# Start development server
npm start
```

Your app will open at http://localhost:3000

Test:
- ✅ Register a new account
- ✅ Login with email/password
- ✅ Login with Google
- ✅ Send a message to the AI
- ✅ Upload a document
- ✅ Sign out

---

## STEP 5 — Deploy to Vercel (Recommended — Free & Easy)

Vercel is the best platform for React apps. Free tier is very generous.

### 5.1 Push Code to GitHub
```bash
# Inside the workwise-enterprise folder
git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/workwise-enterprise.git
git push -u origin main
```

### 5.2 Deploy on Vercel
1. Go to https://vercel.com → **Sign up with GitHub**
2. Click **"Add New Project"**
3. Select your `workwise-enterprise` repository
4. Vercel auto-detects it's a React app

### 5.3 Add Environment Variables in Vercel
Before clicking Deploy:
1. Click **"Environment Variables"** section
2. Add each variable:

| Name | Value |
|------|-------|
| `REACT_APP_ANTHROPIC_API_KEY` | `sk-ant-your-key` |

3. Click **Deploy** → Wait ~2 minutes

### 5.4 Your Live URL
Vercel gives you a URL like: `https://workwise-enterprise.vercel.app`

### 5.5 Add Custom Domain (Optional)
1. In Vercel → your project → **Domains**
2. Add your domain e.g. `workwise.yourcompany.com`
3. Update your DNS records as instructed

---

## STEP 6 — Deploy to Netlify (Alternative)

```bash
# Build the app
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

Or drag & drop the `build/` folder to https://app.netlify.com/drop

---

## STEP 7 — Update Firebase Authorized Domains

After deploying, add your live domain to Firebase:
1. Firebase Console → Authentication → **Settings** tab
2. **Authorized domains** → **Add domain**
3. Add your Vercel URL: `workwise-enterprise.vercel.app`

---

## STEP 8 — Advanced: Secure Backend Proxy (Production Best Practice)

For a real company deployment, protect your API key with a backend:

### Option A: Vercel Serverless Function
Create file: `api/chat.js`

```js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,  // server-side only
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.json(data);
}
```

Then in `AgentPage.js`, change the fetch URL to:
```js
const res = await fetch("/api/chat", { ... });
// Remove the x-api-key header from the frontend
```

Add to Vercel environment variables (without REACT_APP_ prefix):
```
ANTHROPIC_API_KEY=sk-ant-your-key
```

---

## STEP 9 — Future Updates

To update your live app after making changes:
```bash
git add .
git commit -m "Update: describe your change"
git push origin main
# Vercel auto-redeploys in ~60 seconds
```

---

## Deployment Checklist

- [ ] Firebase project created
- [ ] Email/Password auth enabled
- [ ] Google auth enabled
- [ ] `src/firebase.js` updated with real config
- [ ] `.env` file created with Anthropic API key
- [ ] App tested locally (`npm start`)
- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected
- [ ] Environment variables added in Vercel
- [ ] App deployed and live URL working
- [ ] Live domain added to Firebase authorized domains
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Backend proxy set up for API key security

---

## Cost Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/month | $20/mo |
| Firebase Auth | 10,000 users/month | $0.0055/user |
| Anthropic API | Pay per use | ~$3/million tokens |
| Domain name | — | ~$12/year |

**For a small team (under 50 users): essentially FREE**

---

## Support

- Firebase docs: https://firebase.google.com/docs/auth
- Vercel docs: https://vercel.com/docs
- Anthropic docs: https://docs.anthropic.com
- React docs: https://react.dev
