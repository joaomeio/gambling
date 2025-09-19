import { makeRng } from "../services/rng.js";
import { betsApi } from "../services/firebase.js";
import { toast } from "../ui/ui.js";

export function DiceGame(uid){
  const wrap = document.createElement("div");
  wrap.className = "space-y-4";
  wrap.innerHTML = `
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="text-sm text-slate-400">Stake</label>
        <input id="dice-stake" type="number" min="1" value="10" class="w-32 px-3 py-2 rounded-xl bg-bg border border-slate-700">
      </div>
      <div class="w-60">
        <label class="text-sm text-slate-400">Win Chance: <span id="dice-chance-label">50</span>%</label>
        <input id="dice-chance" type="range" min="1" max="95" value="50" class="w-full">
      </div>
      <div class="text-sm text-slate-300">Payout: <span id="dice-payout">1.90×</span></div>
      <button id="dice-play" class="px-4 py-2 rounded-xl bg-bg border border-slate-700">Place Bet</button>
    </div>
    <div id="dice-screen" class="p-6 rounded-2xl bg-bg border border-slate-800 text-center text-3xl font-bold">—</div>
  `;
  const chanceEl = wrap.querySelector("#dice-chance");
  const chanceLabel = wrap.querySelector("#dice-chance-label");
  const payoutEl = wrap.querySelector("#dice-payout");
  const screen = wrap.querySelector("#dice-screen");

  function updatePayout(){
    const chance = Number(chanceEl.value);
    chanceLabel.textContent = chance;
    const houseEdge = 0.05;
    const mult = (1 - houseEdge) * (100 / chance);
    payoutEl.textContent = `${mult.toFixed(2)}×`;
  }
  updatePayout();
  chanceEl.addEventListener("input", updatePayout);

  wrap.querySelector("#dice-play").addEventListener("click", async ()=>{
    const stake = Math.floor(Number(wrap.querySelector("#dice-stake").value||0));
    if (!stake || stake<=0) { toast("Enter a valid stake"); return; }
    const chance = Number(chanceEl.value);
    const clientSeed = `dice-${Date.now()}`;
    const rng = makeRng(clientSeed);
    try {
      const betRef = await betsApi.placeBet(uid, { game:"dice", stake, details:{ clientSeed, chance } });
      const roll = rng()*100; // 0..100
      const houseEdge = 0.05;
      const mult = (1 - houseEdge) * (100 / chance);
      const win = roll < chance;
      screen.textContent = `Roll: ${roll.toFixed(2)} — ${win ? "WIN" : "LOSE"}`;
      const payout = win ? Math.floor(stake * mult) : 0;
      await betsApi.settleBet(uid, betRef, { status: win ? "won":"lost", payout, details:{ roll, chance, mult } });
      toast(win ? `You won ₵${payout}` : "You lost");
    } catch(e){ toast(e.message||"Failed to bet"); }
  });

  return wrap;
}
