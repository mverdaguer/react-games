export const WIDTH = 384
export const HEIGHT = 160
export const CEILING = 14
export const FLOOR = 150
export const THEMES = 6

export const RADIUS = [16, 10, 6, 3] as const
export const BOUNCE_VY = [5.48, 4.84, 4.06, 3.1] as const
export const BALL_VX = [0.55, 0.8, 1.05, 1.35] as const
export const BALL_SCORE = [50, 100, 150, 200] as const
const POP_COST = [8, 4, 2, 1] as const

export const GRAVITY = 0.15
export const PLAYER_W = 12
export const PLAYER_H = 16
export const PLAYER_SPEED = 1.8
export const START_LIVES = 3
export const MAX_LIVES = 9
export const BEAT_TICKS = 90
export const DROP_CHANCE = 0.15
export const DROP_BLINK = 240
export const DROP_LIFE = 360
export const FREEZE_TICKS = 240
export const SLOW_TICKS = 360
export const STUCK_TICKS = 180
export const GUN_COOLDOWN = 8
export const MAX_VOLLEY = 6

const SPAWN_GAP = RADIUS[0] + PLAYER_W / 2 + 12
const ROPE_SPEED = 3
const BULLET_SPEED = 5
const BULLET_LENGTH = 8
const SPLIT_KICK = 1.4
const INVULN_TICKS = 45

export type BallSize = 0 | 1 | 2 | 3
export type Status = "ready" | "playing" | "paused" | "dying" | "cleared" | "over"
export type Weapon = "harpoon" | "wire" | "gun"
export type BoostKind = "double" | "wire" | "gun" | "shield" | "freeze" | "slow" | "dynamite" | "life"
export type ShotMode = "rope" | "sticky" | "bullet"

export type Ball = {
  id: number
  size: BallSize
  x: number
  y: number
  vx: number
  vy: number
}

export type Shot = {
  id: number
  x: number
  y: number
  length: number
  stuck: number
  mode: ShotMode
}

export type Drop = {
  id: number
  kind: BoostKind
  x: number
  y: number
  vy: number
  age: number
}

export type Game = {
  status: Status
  level: number
  score: number
  lives: number
  balls: Ball[]
  playerX: number
  weapon: Weapon
  volley: number
  shots: Shot[]
  drops: Drop[]
  shield: boolean
  freeze: number
  slow: number
  invuln: number
  timer: number
  clock: number
  fireWasDown: boolean
  gunCooldown: number
  seed: number
  baseSeed: number
  nextId: number
}

export type Input = {
  left: boolean
  right: boolean
  fire: boolean
}

export const IDLE: Input = { left: false, right: false, fire: false }

const BOOST_WEIGHTS: readonly { kind: BoostKind; weight: number }[] = [
  { kind: "double", weight: 12 },
  { kind: "wire", weight: 12 },
  { kind: "gun", weight: 10 },
  { kind: "shield", weight: 12 },
  { kind: "freeze", weight: 12 },
  { kind: "slow", weight: 12 },
  { kind: "dynamite", weight: 8 },
  { kind: "life", weight: 3 },
]

const BOOST_TOTAL = BOOST_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0)

const SHOT_CAP: Record<Weapon, number> = {
  harpoon: 1,
  wire: 1,
  gun: 4,
}

export function random(seed: number): [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0
  let t = nextSeed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, nextSeed]
}

export function randomInt(seed: number, max: number): [number, number] {
  if (max <= 0) return [0, seed]
  const [value, nextSeed] = random(seed)
  return [Math.floor(value * max), nextSeed]
}

export function themeIndex(level: number): number {
  return (Math.max(1, Math.floor(level)) - 1) % THEMES
}

export function speedScale(level: number): number {
  const steps = Math.floor((Math.max(1, level) - 1) / 5)
  return Math.min(1.4, 1 + steps * 0.05)
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

function layoutSeed(level: number): number {
  return Math.imul(Math.floor(level), 0x9e3779b9)
}

function sizeWeights(level: number): readonly number[] {
  return [
    level >= 8 ? 2 : level >= 5 ? 1 : 0,
    level >= 4 ? 3 : level >= 2 ? 1 : 0,
    4,
    level >= 12 ? 1 : 3,
  ]
}

function pickSize(level: number, room: number, seed: number): [BallSize, number] {
  const weights = sizeWeights(level)
  let total = 0
  const options: BallSize[] = []
  for (let size = 0; size < 4; size += 1) {
    const weight = weights[size] ?? 0
    if (weight > 0 && (POP_COST[size] ?? 1) <= room) {
      options.push(size as BallSize)
      total += weight
    }
  }
  if (total === 0) return [3, seed]
  const [roll, nextSeed] = randomInt(seed, total)
  let acc = 0
  for (const size of options) {
    acc += weights[size] ?? 0
    if (roll < acc) return [size, nextSeed]
  }
  return [3, nextSeed]
}

export function levelLayout(level: number): Ball[] {
  const count = Math.max(1, Math.floor(level))
  let seed = layoutSeed(count)
  let budget = Math.max(count, 6 + count * 3)
  const scale = speedScale(count)
  const balls: Ball[] = []

  for (let index = 0; index < count; index += 1) {
    const remaining = count - index
    const room = budget - (remaining - 1)
    const [size, nextSeed] = pickSize(count, room, seed)
    seed = nextSeed
    budget -= POP_COST[size]
    const radius = RADIUS[size]
    const center = WIDTH / 2
    const leftCount = Math.floor(count / 2)
    const onLeft = index < leftCount
    const edge = radius + 2
    const slot = onLeft ? index : index - leftCount
    const slots = onLeft ? leftCount : count - leftCount
    const inner = center + (onLeft ? -1 : 1) * (SPAWN_GAP + radius)
    const outer = onLeft ? edge : WIDTH - edge
    const x = clamp(inner + ((slot + 0.5) * (outer - inner)) / slots, edge, WIDTH - edge)
    balls.push({
      id: index + 1,
      size,
      x,
      y: CEILING + radius + 8,
      vx: (onLeft ? -1 : 1) * BALL_VX[size] * scale,
      vy: -BOUNCE_VY[size] * 0.35,
    })
  }

  return balls
}

function fresh(baseSeed: number): Game {
  const balls = levelLayout(1)
  return {
    status: "ready",
    level: 1,
    score: 0,
    lives: START_LIVES,
    balls,
    playerX: WIDTH / 2,
    weapon: "harpoon",
    volley: 1,
    shots: [],
    drops: [],
    shield: false,
    freeze: 0,
    slow: 0,
    invuln: 0,
    timer: 0,
    clock: 0,
    fireWasDown: false,
    gunCooldown: 0,
    seed: baseSeed,
    baseSeed,
    nextId: balls.length + 1,
  }
}

export function createGame(seed: number): Game {
  return fresh(seed | 0)
}

export function start(game: Game): Game {
  if (game.status !== "ready" && game.status !== "paused") return game
  return {
    ...game,
    status: "playing",
    invuln: game.status === "ready" ? INVULN_TICKS : game.invuln,
  }
}

export function pause(game: Game): Game {
  if (game.status !== "playing") return game
  return { ...game, status: "paused" }
}

function beginLevel(game: Game): Game {
  const balls = levelLayout(game.level)
  return {
    ...game,
    status: "playing",
    balls,
    playerX: WIDTH / 2,
    shots: [],
    drops: [],
    freeze: 0,
    slow: 0,
    gunCooldown: 0,
    fireWasDown: false,
    timer: 0,
    nextId: balls.length + 1,
  }
}

function advanceBeat(game: Game): Game {
  if (game.timer > 1) return { ...game, timer: game.timer - 1 }
  if (game.status === "cleared") return beginLevel({ ...game, level: game.level + 1 })
  if (game.lives <= 0) return { ...game, status: "over", timer: 0 }
  return beginLevel({ ...game, invuln: INVULN_TICKS })
}

function movePlayer(x: number, input: Input): number {
  let next = x
  if (input.left) next -= PLAYER_SPEED
  if (input.right) next += PLAYER_SPEED
  return clamp(next, PLAYER_W / 2, WIDTH - PLAYER_W / 2)
}

function shotMode(weapon: Weapon): ShotMode {
  if (weapon === "gun") return "bullet"
  if (weapon === "wire") return "sticky"
  return "rope"
}

function shotCap(game: Game): number {
  if (game.weapon === "harpoon") return game.volley
  return SHOT_CAP[game.weapon]
}

function launch(game: Game, shots: Shot[], nextId: number): { shots: Shot[]; nextId: number; gunCooldown: number } {
  if (shots.length >= shotCap(game)) {
    return { shots, nextId, gunCooldown: game.gunCooldown }
  }
  const mode = shotMode(game.weapon)
  const shot: Shot = {
    id: nextId,
    x: game.playerX,
    y: FLOOR - PLAYER_H,
    length: mode === "bullet" ? BULLET_LENGTH : 2,
    stuck: 0,
    mode,
  }
  return {
    shots: [...shots, shot],
    nextId: nextId + 1,
    gunCooldown: mode === "bullet" ? GUN_COOLDOWN : game.gunCooldown,
  }
}

function moveShot(shot: Shot): Shot | null {
  if (shot.stuck > 0) {
    if (shot.stuck === 1) return null
    return { ...shot, stuck: shot.stuck - 1 }
  }
  const speed = shot.mode === "bullet" ? BULLET_SPEED : ROPE_SPEED
  const y = shot.y - speed
  if (shot.mode === "bullet") {
    if (y + shot.length < CEILING) return null
    return { ...shot, y }
  }
  if (y <= CEILING) {
    if (shot.mode === "sticky") {
      return { ...shot, y: CEILING, length: FLOOR - CEILING, stuck: STUCK_TICKS }
    }
    return null
  }
  return { ...shot, y, length: FLOOR - y }
}

function moveBall(ball: Ball, level: number): Ball {
  const radius = RADIUS[ball.size]
  let x = ball.x + ball.vx
  let vx = ball.vx
  if (x < radius) {
    x = radius
    vx = Math.abs(vx)
  } else if (x > WIDTH - radius) {
    x = WIDTH - radius
    vx = -Math.abs(vx)
  }

  let y = ball.y + ball.vy
  let vy = ball.vy + GRAVITY
  if (y <= CEILING + radius) {
    y = CEILING + radius
    vy = Math.abs(vy)
  } else if (y >= FLOOR - radius) {
    y = FLOOR - radius
    vy = -BOUNCE_VY[ball.size]
    const scale = speedScale(level)
    const direction = vx === 0 ? 1 : Math.sign(vx)
    vx = direction * BALL_VX[ball.size] * scale
  }
  return { ...ball, x, y, vx, vy }
}

function hitsShot(ball: Ball, shot: Shot): boolean {
  const top = shot.y
  const bottom = shot.y + shot.length
  const closestY = clamp(ball.y, Math.min(top, bottom), Math.max(top, bottom))
  const dx = ball.x - shot.x
  const dy = ball.y - closestY
  const reach = RADIUS[ball.size] + 1
  return dx * dx + dy * dy <= reach * reach
}

function playerRect(x: number) {
  return {
    left: x - PLAYER_W / 2 + 2,
    right: x + PLAYER_W / 2 - 2,
    top: FLOOR - PLAYER_H + 2,
    bottom: FLOOR - 1,
  }
}

function hitsRect(
  ball: Ball,
  rect: { left: number; right: number; top: number; bottom: number },
): boolean {
  const closestX = clamp(ball.x, rect.left, rect.right)
  const closestY = clamp(ball.y, rect.top, rect.bottom)
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const reach = RADIUS[ball.size]
  return dx * dx + dy * dy <= reach * reach
}

function splitBall(ball: Ball, nextId: number): { balls: Ball[]; nextId: number } {
  if (ball.size >= 3) return { balls: [], nextId }
  const size = (ball.size + 1) as BallSize
  const kick = Math.min(ball.vy, 0) - SPLIT_KICK
  const children: Ball[] = [-1, 1].map((direction, index) => ({
    id: nextId + index,
    size,
    x: clamp(ball.x, RADIUS[size] + 1, WIDTH - RADIUS[size] - 1),
    y: clamp(ball.y, CEILING + RADIUS[size], FLOOR - RADIUS[size]),
    vx: direction * BALL_VX[size],
    vy: kick,
  }))
  return { balls: children, nextId: nextId + 2 }
}

function pickBoost(seed: number): [BoostKind, number] {
  const [roll, nextSeed] = randomInt(seed, BOOST_TOTAL)
  let acc = 0
  for (const entry of BOOST_WEIGHTS) {
    acc += entry.weight
    if (roll < acc) return [entry.kind, nextSeed]
  }
  return ["life", nextSeed]
}

function popBall(
  ball: Ball,
  seed: number,
  nextId: number,
): { balls: Ball[]; drop: Drop | null; seed: number; nextId: number; score: number } {
  const [chance, afterChance] = random(seed)
  const children = splitBall(ball, nextId)
  if (chance >= DROP_CHANCE) {
    return { balls: children.balls, drop: null, seed: afterChance, nextId: children.nextId, score: BALL_SCORE[ball.size] }
  }
  const [kind, afterKind] = pickBoost(afterChance)
  const drop: Drop = {
    id: children.nextId,
    kind,
    x: ball.x,
    y: ball.y,
    vy: 0.4,
    age: 0,
  }
  return {
    balls: children.balls,
    drop,
    seed: afterKind,
    nextId: children.nextId + 1,
    score: BALL_SCORE[ball.size],
  }
}

function moveDrop(drop: Drop): Drop | null {
  const age = drop.age + 1
  if (age >= DROP_LIFE) return null
  let vy = drop.vy + GRAVITY
  let y = drop.y + vy
  const floor = FLOOR - 4
  if (y >= floor) {
    y = floor
    vy = 0
  }
  return { ...drop, y, vy, age }
}

function collect(game: Game, drop: Drop): Game {
  switch (drop.kind) {
    case "double":
      return {
        ...game,
        weapon: "harpoon",
        volley: Math.min(MAX_VOLLEY, game.volley + 1),
      }
    case "wire":
    case "gun":
      return { ...game, weapon: drop.kind }
    case "shield":
      return { ...game, shield: true }
    case "freeze":
      return { ...game, freeze: FREEZE_TICKS }
    case "slow":
      return { ...game, slow: SLOW_TICKS }
    case "life":
      return { ...game, lives: Math.min(MAX_LIVES, game.lives + 1) }
    case "dynamite":
      return detonate(game)
  }
}

function detonate(game: Game): Game {
  let nextId = game.nextId
  let score = game.score
  const balls: Ball[] = []
  for (const ball of game.balls) {
    if (ball.size >= 3) {
      balls.push(ball)
      continue
    }
    score += BALL_SCORE[ball.size]
    const children = splitBall({ ...ball, size: 2 }, nextId)
    balls.push(...children.balls)
    nextId = children.nextId
  }
  return { ...game, balls, score, nextId }
}

function kill(game: Game): Game {
  return {
    ...game,
    lives: game.lives - 1,
    status: "dying",
    timer: BEAT_TICKS,
    shots: [],
    drops: [],
    shield: false,
    freeze: 0,
    slow: 0,
    weapon: "harpoon",
    volley: 1,
    gunCooldown: 0,
  }
}

function play(game: Game, input: Input): Game {
  let next: Game = {
    ...game,
    clock: game.clock + 1,
    invuln: Math.max(0, game.invuln - 1),
    freeze: Math.max(0, game.freeze - 1),
    slow: Math.max(0, game.slow - 1),
    gunCooldown: Math.max(0, game.gunCooldown - 1),
    playerX: movePlayer(game.playerX, input),
    fireWasDown: input.fire,
  }

  const wantsShot =
    next.weapon === "gun"
      ? input.fire && next.gunCooldown === 0
      : input.fire && !game.fireWasDown
  if (wantsShot) {
    const launched = launch(next, next.shots, next.nextId)
    next = { ...next, shots: launched.shots, nextId: launched.nextId, gunCooldown: launched.gunCooldown }
  }

  const shots: Shot[] = []
  for (const shot of next.shots) {
    const moved = moveShot(shot)
    if (moved) shots.push(moved)
  }

  const moveBalls = next.freeze === 0 && (next.slow === 0 || next.clock % 2 === 0)
  const balls = moveBalls ? next.balls.map((ball) => moveBall(ball, next.level)) : next.balls

  const spent = new Set<number>()
  const survivors: Ball[] = []
  const spawned: Drop[] = []
  let seed = next.seed
  let nextId = next.nextId
  let score = next.score

  for (const ball of balls) {
    const shot = shots.find((item) => !spent.has(item.id) && hitsShot(ball, item))
    if (!shot) {
      survivors.push(ball)
      continue
    }
    spent.add(shot.id)
    const popped = popBall(ball, seed, nextId)
    survivors.push(...popped.balls)
    if (popped.drop) spawned.push(popped.drop)
    seed = popped.seed
    nextId = popped.nextId
    score += popped.score
  }

  const liveShots = shots.filter((shot) => !spent.has(shot.id))
  const drops: Drop[] = []
  for (const drop of [...next.drops, ...spawned]) {
    const moved = moveDrop(drop)
    if (moved) drops.push(moved)
  }

  next = { ...next, balls: survivors, shots: liveShots, drops, seed, nextId, score }

  const body = playerRect(next.playerX)
  const kept: Drop[] = []
  for (const drop of next.drops) {
    const rect = { left: drop.x - 4, right: drop.x + 4, top: drop.y - 4, bottom: drop.y + 4 }
    const overlaps =
      rect.left < body.right && rect.right > body.left && rect.top < body.bottom && rect.bottom > body.top
    if (!overlaps) {
      kept.push(drop)
      continue
    }
    next = collect({ ...next, drops: kept }, drop)
  }
  next = { ...next, drops: kept }

  if (next.invuln === 0) {
    const hit = next.balls.some((ball) => hitsRect(ball, playerRect(next.playerX)))
    if (hit) {
      if (next.shield) return { ...next, shield: false, invuln: INVULN_TICKS }
      return kill(next)
    }
  }

  if (next.balls.length === 0) {
    return { ...next, status: "cleared", timer: BEAT_TICKS, score: next.score + next.level * 500, shots: [] }
  }
  return next
}

export function step(game: Game, input: Input): Game {
  if (game.status === "dying" || game.status === "cleared") return advanceBeat(game)
  if (game.status !== "playing") return game
  return play(game, input)
}
