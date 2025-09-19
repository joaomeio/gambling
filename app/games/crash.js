import { makeRng } from "../services/rng.js";
import { betsApi } from "../services/firebase.js";
import { toast } from "../ui/ui.js";

export function CrashGame(uid){
  const wrap = document.createElement("div");
  wrap.className = "space-y-4";
  // Controls
  const controls = document.createElement("div");
  controls.className = "flex flex-wrap items-end gap-3";
  controls.innerHTML = `
    <div>
      <label class="text-sm text-slate-400">Stake</label>
      <input id="crash-stake" type="number" min="1" value="10" class="w-32 px-3 py-2 rounded-xl bg-bg border border-slate-700">
    </div>
    <div>
      <label class="text-sm text-slate-400">Auto Cash Out (x)</label>
      <input id="crash-auto" type="number" min="1" step="0.1" placeholder="optional" class="w-32 px-3 py-2 rounded-xl bg-bg border border-slate-700">
    </div>
    <button id="crash-place" class="px-4 py-2 rounded-xl bg-bg border border-slate-700">Place Bet</button>
    <button id="crash-cashout" class="px-4 py-2 rounded-xl bg-bg border border-slate-700" disabled>Cash Out</button>
  `;
  wrap.appendChild(controls);

  const screen = document.createElement("div");
  screen.className = "p-6 rounded-2xl bg-bg border border-slate-800 text-center text-3xl font-bold";
  screen.textContent = "1.00×";
  wrap.appendChild(screen);

  let state = { running:false, t0:null, mult:1, busted:false, animId:null, betRef:null, rng:null, bustAt: null };

  function startRound(stake){
    const clientSeed = `${uid}-${Date.now()}`;
    state.rng = makeRng(clientSeed);
    const u = state.rng();
    // Sample bust point: 1 + exponential(λ=1.2) capped
    const bust = 1 + (-Math.log(1 - Math.min(u, 0.999999)) / 1.2);
    state.bustAt = Math.min(50, bust);
    state.mult = 1; state.busted=false;
    state.running=true; state.t0=performance.now();

    betsApi.placeBet(uid, { game:"crash", stake, details:{ clientSeed, bustAt: state.bustAt } })
      .then(ref => { state.betRef = ref; animate(); toast("Bet placed. Good luck!"); })
      .catch(err => { state.running=false; toast(err.message||"Failed to place bet"); });
  }

  function animate(){
    cancelAnimationFrame(state.animId);
    const dt = (performance.now() - state.t0)/1000;
    // Grow multiplier (accelerating curve)
    state.mult = Math.max(1, Math.pow(1.06, dt*12));
    if (state.mult >= state.bustAt && !state.busted){
      state.busted = true;
      screen.textContent = `BUSTED @ ${state.bustAt.toFixed(2)}×`;
      controls.querySelector("#crash-cashout").disabled = true;
      // settle as lost
      if (state.betRef) betsApi.settleBet(uid, state.betRef, { status:"lost", payout:0, details:{ ...state.details, endedAt: Date.now(), cashout:null } });
      toast("Busted!");
      state.running=false;
      return;
    }
    screen.textContent = `${state.mult.toFixed(2)}×`;
    // Auto cashout
    const auto = parseFloat(controls.querySelector("#crash-auto").value);
    if (!isNaN(auto) && auto>0 && state.mult >= auto){
      doCashout();
      return;
    }
    state.animId = requestAnimationFrame(animate);
  }

  function doCashout(){
    if (!state.running || state.busted) return;
    state.running=false;
    const m = Math.min(state.mult, state.bustAt);
    screen.textContent = `CASHED @ ${m.toFixed(2)}×`;
    controls.querySelector("#crash-cashout").disabled = true;
    const payout = Math.floor(Number(controls.querySelector("#crash-stake").value || 0) * m);
    if (state.betRef) betsApi.settleBet(uid, state.betRef, { status:"won", payout, details:{ cashout:m, endedAt: Date.now() } });
    toast(`You won ₵${payout}`);
  }

  controls.querySelector("#crash-place").addEventListener("click", async ()=>{
    if (state.running) return;
    const stake = Math.floor(Number(controls.querySelector("#crash-stake").value||0));
    if (!stake || stake<=0) { toast("Enter a valid stake"); return; }
    controls.querySelector("#crash-cashout").disabled = false;
    startRound(stake);
  });
  controls.querySelector("#crash-cashout").addEventListener("click", doCashout);

  return wrap;
}
