import { makeRng, choice } from "../services/rng.js";
import { betsApi } from "../services/firebase.js";
import { toast } from "../ui/ui.js";

export function PlinkoGame(uid){
  const wrap = document.createElement("div");
  wrap.className = "space-y-4";
  wrap.innerHTML = `
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="text-sm text-slate-400">Stake</label>
        <input id="plinko-stake" type="number" min="1" value="10" class="w-32 px-3 py-2 rounded-xl bg-bg border border-slate-700">
      </div>
      <div>
        <label class="text-sm text-slate-400">Rows</label>
        <select id="plinko-rows" class="px-3 py-2 rounded-xl bg-bg border border-slate-700">
          <option>8</option><option>10</option><option selected>12</option><option>14</option>
        </select>
      </div>
      <button id="plinko-play" class="px-4 py-2 rounded-xl bg-bg border border-slate-700">Drop</button>
    </div>
    <div id="plinko-screen" class="p-6 rounded-2xl bg-bg border border-slate-800 text-center">
      <div class="text-3xl font-bold" id="plinko-result">—</div>
      <div class="mt-2 text-slate-300 text-sm" id="plinko-path"></div>
    </div>
  `;
  const screen = wrap.querySelector("#plinko-result");
  const pathEl = wrap.querySelector("#plinko-path");

  function payoutFor(slot, rows){
    // Simple symmetric tiering, center ~1.8x, edges higher risk
    const n = rows;
    const center = n/2;
    const dist = Math.abs(slot - center);
    const base = 1.8;
    const edgeBonus = 0.25 * dist;
    const mult = Math.max(0.2, base - 0.15*dist + edgeBonus);
    return Number(mult.toFixed(2));
  }

  wrap.querySelector("#plinko-play").addEventListener("click", async ()=>{
    const stake = Math.floor(Number(wrap.querySelector("#plinko-stake").value||0));
    if (!stake || stake<=0) { toast("Enter a valid stake"); return; }
    const rows = Number(wrap.querySelector("#plinko-rows").value);
    const clientSeed = `plinko-${Date.now()}`;
    const rng = makeRng(clientSeed);
    try {
      const betRef = await betsApi.placeBet(uid, { game:"plinko", stake, details:{ clientSeed, rows } });
      // Simulate path
      let slot = 0, path = [];
      for (let i=0;i<rows;i++){
        const right = rng() < 0.5 ? 0 : 1;
        path.push(right ? "R" : "L");
        slot += right;
      }
      screen.textContent = `Slot ${slot} / ${rows}`;
      pathEl.textContent = `Path: ${path.join("-")}`;
      const mult = payoutFor(slot, rows);
      const payout = Math.floor(stake * mult);
      const win = payout > 0;
      await betsApi.settleBet(uid, betRef, { status: win ? "won":"lost", payout, details:{ slot, rows, mult, path } });
      toast(win ? `You won ₵${payout}` : "You lost");
    } catch(e){ toast(e.message||"Failed to drop"); }
  });

  return wrap;
}
