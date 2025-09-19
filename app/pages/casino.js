import { CrashGame } from "../games/crash.js";
import { DiceGame } from "../games/dice.js";
import { PlinkoGame } from "../games/plinko.js";
import { openModal } from "../ui/ui.js";

export function renderCasino(uid){
  const grid = document.getElementById("games-grid");
  const search = document.getElementById("casino-search");
  const filter = document.getElementById("casino-filter");
  const games = [
    { id:"crash", name:"Crash", tags:["animated"], comp:()=>CrashGame(uid) },
    { id:"dice", name:"Dice", tags:["fast"], comp:()=>DiceGame(uid) },
    { id:"plinko", name:"Plinko", tags:["animated"], comp:()=>PlinkoGame(uid) },
  ];
  function card(g){
    const el = document.createElement("button");
    el.className = "text-left p-4 rounded-2xl bg-card border border-slate-800 hover:shadow-glow focus-ring";
    el.innerHTML = `<div class="text-lg font-semibold">${g.name}</div><div class="text-slate-400 text-sm">${g.tags.join(" • ")}</div>`;
    el.addEventListener("click", ()=> openModal(g.name, g.comp()));
    return el;
  }
  function render(){
    const q = (search.value||"").toLowerCase();
    const f = filter.value;
    grid.innerHTML = "";
    games.filter(g => (f==="all"||g.tags.includes(f)) && g.name.toLowerCase().includes(q)).forEach(g => grid.appendChild(card(g)));
  }
  render();
  search.addEventListener("input", render);
  filter.addEventListener("change", render);
}
