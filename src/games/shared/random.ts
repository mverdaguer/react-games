// mulberry32. Same seed always yields the same fraction, then a new seed for the next draw.
export function random(seed: number): [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0
  let t = nextSeed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, nextSeed]
}

// A whole number in [0, max). The fraction is scaled and truncated, and the seed still advances.
export function randomInt(seed: number, max: number): [number, number] {
  if (max <= 0) return [0, seed]
  const [value, nextSeed] = random(seed)
  return [Math.floor(value * max), nextSeed]
}
