export function toast(msg, ms=2000) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(()=>el.classList.add("hidden"), ms);
}
export function openModal(title, contentEl) {
  document.getElementById("game-title").textContent = title;
  const box = document.getElementById("game-container");
  box.innerHTML = "";
  box.appendChild(contentEl);
  const m = document.getElementById("game-modal");
  m.classList.remove("hidden");
  m.classList.add("flex");
}
export function closeModal() {
  const m = document.getElementById("game-modal");
  m.classList.add("hidden");
  m.classList.remove("flex");
}
document.addEventListener("click", (e)=>{
  if (e.target.matches("[data-close-modal]")) closeModal();
});
