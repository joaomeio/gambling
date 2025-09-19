// Seedable RNG (xorshift32) for reproducible demo rounds.
export function makeRng(seed) {
  // Accepts string or number seed
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(seed).length; i++) {
    h ^= String(seed).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let x = (h || 123456789) >>> 0;
  return function() {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 0x100000000;
  };
}
export function choice(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
