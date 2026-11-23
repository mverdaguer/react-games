// Blocked score names for English, Spanish, and Catalan.
// Each entry is already lowercase, with no accents. The check compares a
// normalized form of the typed name, so case, accents, and simple disguises
// still match. A repeated letter counts as a blocked word only when every
// run is at least as long as in the blocked spelling.

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

type LetterRun = { char: string; length: number }

function letterRuns(value: string): LetterRun[] {
  const parsed: LetterRun[] = []
  for (const char of value) {
    const last = parsed.at(-1)
    if (last && last.char === char) last.length += 1
    else parsed.push({ char, length: 1 })
  }
  return parsed
}

function covers(text: string, banned: string): boolean {
  const hay = letterRuns(text)
  const needle = letterRuns(banned)
  if (needle.length === 0 || hay.length !== needle.length) return false
  for (let index = 0; index < needle.length; index += 1) {
    const left = hay[index]
    const right = needle[index]
    if (!left || !right || left.char !== right.char || left.length < right.length) return false
  }
  return true
}

function containsStretch(text: string, banned: string): boolean {
  const hay = letterRuns(text)
  const needle = letterRuns(banned)
  if (needle.length === 0 || hay.length < needle.length) return false
  for (let start = 0; start <= hay.length - needle.length; start += 1) {
    let matched = true
    for (let index = 0; index < needle.length; index += 1) {
      const left = hay[start + index]
      const right = needle[index]
      if (!left || !right || left.char !== right.char || left.length < right.length) {
        matched = false
        break
      }
    }
    if (matched) return true
  }
  return false
}

function matchesCover(text: string, list: ReadonlySet<string>): boolean {
  if (list.has(text)) return true
  for (const entry of list) {
    if (covers(text, entry)) return true
  }
  return false
}

export function isAllowedName(name: string): boolean {
  const plain = fold(name).replace(/[ _-]+/g, "")
  if (matchesCover(plain, ALLOWED)) return true

  const words = fold(name)
    .split(/[ _-]+/)
    .filter((word) => word.length > 0)

  if (matchesCover(plain, SHORT)) return false
  for (const word of words) {
    if (matchesCover(word, SHORT)) return false
  }

  for (const banned of LONG) {
    if (containsStretch(plain, banned)) return false
  }
  return true
}
