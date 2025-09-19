import { auth, authApi, db, walletApi, betsApi, seedNewUser } from "./services/firebase.js";
import { toast, closeModal } from "./ui/ui.js";
import { renderCasino } from "./pages/casino.js";
import { doc, onSnapshot, query, orderBy, limit, collection } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Simple hash router
const pages = ["home","casino","wallet","profile","auth","responsible"];
function showPage(id){
  pages.forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle("active", p===id);
  });
  if (id==="casino" && auth.currentUser) renderCasino(auth.currentUser.uid);
}

// Navbar auth controls & balance
let unsubBalance = null;
authApi.onChange(async (user)=>{
  const bar = document.getElementById("auth-controls");
  const live = document.getElementById("live-balance");
  const amount = document.getElementById("balance-amount");
  if (unsubBalance){ unsubBalance(); unsubBalance=null; }
  if (user){
    bar.innerHTML = `
      <span class="hidden sm:inline text-sm text-slate-400">Hi, ${user.displayName || user.email}</span>
      <a href="#/profile" class="px-3 py-1 rounded-xl bg-bg border border-slate-700 focus-ring">Profile</a>
      <button id="btn-logout" class="px-3 py-1 rounded-xl bg-bg border border-slate-700 focus-ring">Sign Out</button>
    `;
    document.getElementById("live-balance").classList.remove("hidden");
    unsubBalance = walletApi.listenBalance(user.uid, (bal)=>{
      amount.textContent = bal===null ? "—" : String(bal);
      const wb = document.getElementById("wallet-balance");
      if (wb) wb.textContent = amount.textContent;
    });
    // Listen profile tx/bets newest
    setupProfileStreams(user.uid);
  } else {
    bar.innerHTML = `<a href="#/auth" class="px-3 py-1 rounded-xl bg-bg border border-slate-700 focus-ring">Sign In</a>`;
    live.classList.add("hidden");
    amount.textContent = "—";
  }
});

// Auth page actions
function setupAuth(){
  const form = document.getElementById("auth-form");
  const emailEl = document.getElementById("auth-email");
  const passEl = document.getElementById("auth-password");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      await authApi.emailSignin(emailEl.value, passEl.value);
      toast("Signed in");
      location.hash = "#/casino";
    }catch(err){ toast(err.message || "Sign-in failed"); }
  });
  document.getElementById("btn-email-signup").addEventListener("click", async ()=>{
    try{
      const cred = await authApi.emailSignup(emailEl.value, passEl.value);
      await seedNewUser(cred.user.uid, cred.user.email, cred.user.displayName || null);
      toast("Account created");
      location.hash = "#/casino";
    }catch(err){ toast(err.message || "Sign-up failed"); }
  });
  document.getElementById("btn-google").addEventListener("click", async ()=>{
    try{
      const cred = await authApi.googlePopup();
      await seedNewUser(cred.user.uid, cred.user.email, cred.user.displayName || null);
      toast("Signed in with Google");
      location.hash = "#/casino";
    }catch(err){ toast(err.message || "Google sign-in failed"); }
  });
  document.getElementById("btn-reset").addEventListener("click", async ()=>{
    try{
      await authApi.resetPassword(emailEl.value);
      toast("Password reset email sent");
    }catch(err){ toast(err.message || "Reset failed"); }
  });
}

// Profile streams and pagination
let txCursor = null, betsCursor = null;
function setupProfileStreams(uid){
  const txList = document.getElementById("tx-list");
  const txMore = document.getElementById("tx-load-more");
  const betsList = document.getElementById("bets-list");
  const betsMore = document.getElementById("bets-load-more");

  async function loadTx(reset=false){
    const snap = await walletApi.fetchTransactions(uid, reset?null:txCursor);
    if (reset) txList.innerHTML = "";
    snap.forEach(doc=>{
      const d = doc.data();
      const el = document.createElement("div");
      el.className = "p-3 rounded-xl bg-bg border border-slate-800 flex justify-between";
      el.innerHTML = `<div>
        <div class="text-sm text-slate-400">${new Date(d.createdAt?.toMillis?.() || Date.now()).toLocaleString()}</div>
        <div class="text-slate-200">${d.type} — ${d.note||d.reference||""}</div>
      </div>
      <div class="font-semibold ${d.type==='debit'?'text-danger':'text-neon'}"> ${d.type==='debit'?'-':'+'}₵${d.amount} </div>`;
      txList.appendChild(el);
    });
    txCursor = snap.docs[snap.docs.length-1] || txCursor;
  }
  async function loadBets(reset=false){
    const snap = await betsApi.pageBets(uid, reset?null:betsCursor);
    if (reset) betsList.innerHTML = "";
    snap.forEach(doc=>{
      const d = doc.data();
      const el = document.createElement("div");
      el.className = "p-3 rounded-xl bg-bg border border-slate-800";
      el.innerHTML = `<div class="flex justify-between"><div class="font-semibold">${d.game}</div><div class="text-sm text-slate-400">${d.status}</div></div>
      <div class="text-sm text-slate-400">${new Date(d.createdAt?.toMillis?.() || Date.now()).toLocaleString()}</div>
      <div class="text-sm">Stake: ₵${d.stake} • Payout: ₵${d.payout}</div>`;
      betsList.appendChild(el);
    });
    betsCursor = snap.docs[snap.docs.length-1] || betsCursor;
  }

  txMore.onclick = ()=>loadTx(false);
  betsMore.onclick = ()=>loadBets(false);
  loadTx(true); loadBets(true);
}

// Routing
function route(){
  const hash = location.hash || "#/home";
  const id = (hash.replace("#/","") || "home");
  if (!pages.includes(id)) return;
  showPage(id);
  if (id==="auth") setupAuth();
  if (id==="casino") closeModal();
}
window.addEventListener("hashchange", route);
route();

// Game modal focus trap basic
document.addEventListener("keydown", (e)=>{
  if (e.key==="Escape") closeModal();
});
