// Firebase init (v9 modular via CDN). Add your config in firebase-config.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, collection, addDoc, query, orderBy, limit, startAfter, runTransaction, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth helpers
export const authApi = {
  onChange: (cb) => onAuthStateChanged(auth, cb),
  googlePopup: () => signInWithPopup(auth, new GoogleAuthProvider()),
  emailSignin: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
  emailSignup: (email, pass) => createUserWithEmailAndPassword(auth, email, pass),
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
  signOut: () => signOut(auth),
  updateProfile: (data) => updateProfile(auth.currentUser, data)
};

// Seed new user profile + wallet atomically.
export async function seedNewUser(uid, email, displayName) {
  const userRef = doc(db, "users", uid);
  const walletRef = doc(db, "users", uid, "wallet", "main");
  const txCol = collection(db, "users", uid, "transactions");

  await runTransaction(db, async (trx) => {
    const uSnap = await trx.get(userRef);
    if (!uSnap.exists()) {
      trx.set(userRef, {
        displayName: displayName || email.split("@")[0],
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        locale: navigator.language || "en"
      });
    }
    const wSnap = await trx.get(walletRef);
    if (!wSnap.exists()) {
      trx.set(walletRef, {
        balance: 1000,
        updatedAt: serverTimestamp()
      });
      trx.set(doc(txCol), {
        type: "seed",
        amount: 1000,
        balanceAfter: 1000,
        reference: "welcome",
        note: "Initial play credits",
        createdAt: serverTimestamp()
      });
    }
  });
}

// Wallet API with atomic transactions
export const walletApi = {
  listenBalance(uid, cb) {
    const ref = doc(db, "users", uid, "wallet", "main");
    return onSnapshot(ref, (snap) => cb(snap.exists() ? snap.data().balance : null));
  },
  async credit(uid, amount, reference, note) {
    if (amount <= 0) throw new Error("Amount must be positive");
    const wRef = doc(db, "users", uid, "wallet", "main");
    const txCol = collection(db, "users", uid, "transactions");
    await runTransaction(db, async (trx) => {
      const wSnap = await trx.get(wRef);
      const cur = (wSnap.exists() ? wSnap.data().balance : 0) | 0;
      const next = cur + Math.floor(amount);
      trx.update(wRef, { balance: next, updatedAt: serverTimestamp() });
      trx.set(doc(txCol), {
        type: "credit", amount: Math.floor(amount), balanceAfter: next, reference, note, createdAt: serverTimestamp()
      });
    });
  },
  async debit(uid, amount, reference, note) {
    if (amount <= 0) throw new Error("Amount must be positive");
    const wRef = doc(db, "users", uid, "wallet", "main");
    const txCol = collection(db, "users", uid, "transactions");
    await runTransaction(db, async (trx) => {
      const wSnap = await trx.get(wRef);
      const cur = (wSnap.exists() ? wSnap.data().balance : 0) | 0;
      const amt = Math.floor(amount);
      if (cur - amt < 0) throw new Error("Insufficient balance");
      const next = cur - amt;
      trx.update(wRef, { balance: next, updatedAt: serverTimestamp() });
      trx.set(doc(txCol), {
        type: "debit", amount: amt, balanceAfter: next, reference, note, createdAt: serverTimestamp()
      });
    });
  },
  // Paged transactions
  async fetchTransactions(uid, cursor=null, pageSize=20) {
    const txRef = collection(db, "users", uid, "transactions");
    let q = query(txRef, orderBy("createdAt","desc"), limit(pageSize));
    if (cursor) q = query(txRef, orderBy("createdAt","desc"), startAfter(cursor), limit(pageSize));
    const snap = await getDocs(q);
    return snap;
  }
};

// Bets API
export const betsApi = {
  async placeBet(uid, { game, stake, details }) {
    if (stake <= 0) throw new Error("Stake must be positive");
    const wRef = doc(db, "users", uid, "wallet", "main");
    const txCol = collection(db, "users", uid, "transactions");
    const betCol = collection(db, "users", uid, "bets");
    let betRefNew;
    await runTransaction(db, async (trx) => {
      const wSnap = await trx.get(wRef);
      const cur = (wSnap.exists() ? wSnap.data().balance : 0) | 0;
      const amt = Math.floor(stake);
      if (cur - amt < 0) throw new Error("Insufficient balance");
      const next = cur - amt;
      betRefNew = doc(betCol);
      trx.update(wRef, { balance: next, updatedAt: serverTimestamp() });
      trx.set(betRefNew, {
        game, stake: amt, status: "pending", payout: 0, details: details || {}, createdAt: serverTimestamp(), settledAt: null
      });
      trx.set(doc(txCol), {
        type: "debit", amount: amt, balanceAfter: next, reference: `bet:${game}`, note: "Bet placed", createdAt: serverTimestamp()
      });
    });
    return betRefNew;
  },
  async settleBet(uid, betRef, { status, payout, details }) {
    const wRef = doc(db, "users", uid, "wallet", "main");
    const txCol = collection(db, "users", uid, "transactions");
    await runTransaction(db, async (trx) => {
      const betSnap = await trx.get(betRef);
      if (!betSnap.exists()) throw new Error("Bet not found");
      const bet = betSnap.data();
      if (bet.status !== "pending") throw new Error("Bet already settled");
      let finalBalance = null;
      if (status === "won" && payout > 0) {
        const wSnap = await trx.get(wRef);
        const cur = (wSnap.exists() ? wSnap.data().balance : 0) | 0;
        const next = cur + Math.floor(payout);
        trx.update(wRef, { balance: next, updatedAt: serverTimestamp() });
        trx.set(doc(txCol), {
          type: "credit", amount: Math.floor(payout), balanceAfter: next, reference: `bet:${bet.game}`, note: "Bet won", createdAt: serverTimestamp()
        });
        finalBalance = next;
      }
      trx.update(betRef, { status, payout: Math.floor(payout||0), details: details || bet.details, settledAt: serverTimestamp() });
    });
  },
  async pageBets(uid, cursor=null, pageSize=20) {
    const betCol = collection(db, "users", uid, "bets");
    let q = query(betCol, orderBy("createdAt","desc"), limit(pageSize));
    if (cursor) q = query(betCol, orderBy("createdAt","desc"), startAfter(cursor), limit(pageSize));
    return await getDocs(q);
  }
};
