// Blocked score names for English, Spanish, and Catalan.
// Each entry is already lowercase, with no accents. The check compares a
// normalized form of the typed name, so case, accents, and simple disguises
// still match.

const SHORT_WORDS = [
  "anal",
  "ass",
  "cock",
  "cono",
  "cul",
  "cum",
  "cunt",
  "dick",
  "dyke",
  "fag",
  "fuck",
  "gook",
  "jizz",
  "kike",
  "nazi",
  "paki",
  "piss",
  "porn",
  "puta",
  "puto",
  "rape",
  "sex",
  "shit",
  "slut",
  "spic",
  "tit",
  "tits",
  "twat",
] as const

const LONG_WORDS = [
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "cabron",
  "cabrona",
  "cabrones",
  "capullo",
  "chingar",
  "cocksucker",
  "cojones",
  "collons",
  "dickhead",
  "faggot",
  "filldeputa",
  "follar",
  "fucker",
  "gilipollas",
  "gilipolles",
  "hijodeputa",
  "hijoputa",
  "hostia",
  "imbecil",
  "joder",
  "mamon",
  "mamona",
  "marica",
  "maricon",
  "maricona",
  "merda",
  "mierda",
  "motherfucker",
  "nigger",
  "nigga",
  "pendeja",
  "pendejo",
  "polla",
  "pussy",
  "putamadre",
  "retard",
  "retrasado",
  "shitter",
  "subnormal",
  "verga",
  "wanker",
  "whore",
  "zorra",
] as const

// Innocent names that the rules would otherwise catch. Compared after the same
// normalization as a blocked word, and only as the whole name.
const ALLOWED_NAMES = [
  "cockburn",
  "niger",
  "nigeria",
  "nigerian",
  "pola",
  "scunthorpe",
  "zora",
] as const

const DIGIT_SWAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
}

const SHORT = new Set<string>(SHORT_WORDS)
const LONG = new Set<string>(LONG_WORDS)
const ALLOWED = new Set<string>(ALLOWED_NAMES)

function fold(value: string): string {
  const plain = value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  let swapped = ""
  for (const char of plain) swapped += DIGIT_SWAP[char] ?? char
  return swapped
}

function collapse(value: string): string {
  return value.replace(/(.)\1+/gu, "$1")
}

export function isAllowedName(name: string): boolean {
  const plain = fold(name).replace(/[ _-]+/g, "")
  const collapsed = collapse(plain)
  if (ALLOWED.has(plain) || ALLOWED.has(collapsed)) return true

  const words = fold(name)
    .split(/[ _-]+/)
    .filter((word) => word.length > 0)

  for (const banned of SHORT) {
    const bannedFlat = collapse(banned)
    if (collapsed === banned || collapsed === bannedFlat) return false
    for (const word of words) {
      if (word === banned || collapse(word) === bannedFlat) return false
    }
  }

  for (const banned of LONG) {
    if (plain.includes(banned) || collapsed.includes(collapse(banned))) return false
  }
  return true
}
