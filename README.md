# NebulaPlay — Educational Demo (Play Credits Only)

> **Educational Demo Only — No Real Gambling.** This project uses **play credits** only. No deposits, withdrawals, crypto, or third-party gambling APIs.

## Features
- Modern, responsive, dark UI with neon accents; accessible & keyboard-friendly.
- Firebase v9 (modular, CDN): Email/Password + Google auth.
- Cloud Firestore: user profile, wallet, append-only transactions, bets.
- **Atomic** wallet credit/debit via Firestore transactions (no negative balances).
- Live balance in navbar via real-time listeners.
- Pages: Home, Casino, Wallet, Auth, Profile, Responsible Play.
- Games: **Crash**, **Dice**, **Plinko** (client-side demo). Each game interacts with the wallet.
- Search/filter on Casino page, toasts, modal, bet slip-like controls.
- Firestore Security Rules restricting users to their own data and disallowing unsafe writes.

## Quick Start
1. **Create Firebase Project**
   - Go to Firebase Console → Create Project.
   - Add a **Web App**; copy the config.

2. **Enable Providers**
   - Authentication → Sign-in methods → enable **Email/Password** and **Google**.

3. **Create Firestore**
   - Firestore Database → Start in **production** mode (will use rules in this repo).

4. **Add Config**
   - Copy `app/firebase-config.example.js` to `app/firebase-config.js` and fill in your web app keys:
   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

5. **Set Security Rules**
   - Console → Firestore → Rules → paste contents of `firestore.rules` → Publish.

6. **Run Locally (no build)**
   - Serve the folder with any static server (e.g., VSCode Live Server or Python):
     ```bash
     # from project root
     python3 -m http.server 5173
     # Visit http://localhost:5173
     ```

7. **Deploy to Static Host**
   - GitHub Pages, Netlify, or Vercel (static). Ensure paths use `#/` hash routes.

## Firebase Emulator Suite (Recommended for local testing)
- Install Firebase CLI and run emulators:
  ```bash
  npm i -g firebase-tools
  firebase login
  firebase init emulators
  # choose Firestore + Auth
  firebase emulators:start
  ```
- In another terminal, serve the static site (step 6). Use the **Emulator UI** to inspect data.

## Data Model
- `users/{uid}`: `{ displayName, email, timestamps, locale }`
- `users/{uid}/wallet/main`: `{ balance:int, updatedAt }`
- `users/{uid}/transactions/{txId}`: `{ type, amount>0, balanceAfter, reference, note, createdAt }`
- `users/{uid}/bets/{betId}`: `{ game, stake, status, payout, details, createdAt, settledAt }`

**Behavior**
- On first sign-up, create `users/{uid}` and seed `wallet/main` with **1000 credits** (also writes a seed transaction).
- Wallet operations (`credit`, `debit`) use **runTransaction** and write a matching **transaction**.
- Bets: `placeBet` (debit + create pending bet) → game resolves → `settleBet` (update status, credit payout, write transaction).

## Accessibility Notes
- Semantic headings, focus styles (`.focus-ring`), keyboard support for modals (Esc).
- High contrast text; color-scheme: dark.

## Required Indexes
- Default queries use single-field `createdAt` ordering; Firestore auto-indexes them. No custom composite index needed.

## Project Structure
```
nebula-play/
  index.html
  firestore.rules
  app/
    firebase-config.example.js
    main.js
    pages/casino.js
    services/
      firebase.js
      rng.js
    games/
      crash.js
      dice.js
      plinko.js
    ui/ui.js
  assets/
    logo.svg
    favicon.svg
```

## Acceptance Checklist
- New users signup (email/pwd or Google) → profile + wallet seeded with 1000 credits.
- Live balance in navbar; wallet page mirrors it.
- Placing a bet creates a **pending** bet and debits stake atomically.
- Settlements credit winnings atomically and append transactions.
- Transactions are append-only and paginated in Profile.
- Security rules block cross-user access; wallet never negative.
- UI is responsive on mobile + desktop.

## Disclaimer
This code is for **education**. Do not repurpose for real gambling or financial transactions.
