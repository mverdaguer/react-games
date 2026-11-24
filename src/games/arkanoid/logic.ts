import { bricksFor, type Brick } from "@/games/arkanoid/levels"
import { randomInt } from "@/games/shared/random"

export type { Brick, BrickKind, ColorId } from "@/games/arkanoid/levels"

export const SUB = 256
export const COLUMNS = 13
export const BRICK_W = 8
export const BRICK_H = 4
export const FIELD_X = 4
export const FIELD_TOP = 12
export const MAX_ROWS = 12
export const PADDLE_Y = 128
export const PADDLE_H = 4
export const PADDLE_W = 16
export const PADDLE_WIDE = 24
export const BALL_R = 2
export const START_LIVES = 3
export const MAX_LIVES = 9
export const FIELD_RIGHT = FIELD_X + COLUMNS * BRICK_W
export const GATE_X = FIELD_RIGHT
export const DYING_TICKS = 45
export const CLEARED_TICKS = 60

const CEILING = 4
const PADDLE_SPEED = 2 * SUB
const LASER_SPEED = 4 * SUB
const LASER_CAP = 2
const CAPSULE_W = 8
const CAPSULE_H = 4
const BASE_SPEED = 560
const MAX_SPEED = 920
const SLOW_SPEED = 410
const SPEED_STEP = 16
const LIFE_SCORE = 20_000
const LIFE_GAP = 60_000
const GATE_SCORE = 10_000
const COLOR_SCORE = [50, 60, 70, 80, 100, 120] as const

const ZONES: readonly (readonly [number, number])[] = [
  [-3, -4],
  [-2, -4],
  [-1, -3],
  [-1, -6],
  [1, -6],
  [1, -3],
  [2, -4],
  [3, -4],
]

const CAPSULE_KINDS = ["slow", "catch", "expand", "disruption", "laser", "break", "player"] as const

export type CapsuleKind = (typeof CAPSULE_KINDS)[number]
export type Status = "ready" | "playing" | "paused" | "dying" | "cleared" | "over"

export type Ball = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  stuck: boolean
  stuckOffset: number
}

export type Capsule = {
  kind: CapsuleKind
  x: number
  y: number
}

export type Laser = {
  x: number
  y: number
}

export type Game = {
  status: Status
  level: number
  score: number
  lives: number
  bricks: Brick[]
  balls: Ball[]
  paddleX: number
  wide: boolean
  capsule: Capsule | null
  lasers: Laser[]
  laser: boolean
  catchOn: boolean
  slow: boolean
  gate: boolean
  disruption: boolean
  timer: number
  fireWasDown: boolean
  seed: number
  baseSeed: number
  nextId: number
  speed: number
}

export type Input = { left: boolean; right: boolean; fire: boolean }
export const IDLE: Input = { left: false, right: false, fire: false }

type Draft = {
  bricks: Brick[]
  score: number
  seed: number
  capsule: Capsule | null
  speed: number
  slow: boolean
  cleared: boolean
  gate: boolean
  disruption: boolean
  level: number
}

function isqrt(n: number): number {
  if (n <= 0) return 0
  let x = n
  let y = Math.floor((x + 1) / 2)
  while (y < x) {
    x = y
    y = Math.floor((x + Math.floor(n / x)) / 2)
  }
  return x
}

function paddleWidth(wide: boolean): number {
  return wide ? PADDLE_WIDE : PADDLE_W
}

function centeredPaddle(wide: boolean): number {
  const span = FIELD_RIGHT - FIELD_X
  return (FIELD_X + Math.floor((span - paddleWidth(wide)) / 2)) * SUB
}

function clampPaddle(x: number, wide: boolean): number {
  const min = FIELD_X * SUB
  const max = (FIELD_RIGHT - paddleWidth(wide)) * SUB
  if (x < min) return min
  if (x > max) return max
  return x
}

function clampOffset(offset: number, wide: boolean): number {
  const min = BALL_R * SUB
  const max = (paddleWidth(wide) - BALL_R) * SUB
  if (offset < min) return min
  if (offset > max) return max
  return offset
}

function zoneIndex(offset: number, wide: boolean): number {
  const width = paddleWidth(wide) * SUB
  const clamped = offset < 0 ? 0 : offset >= width ? width - 1 : offset
  return Math.min(7, Math.floor((clamped * 8) / width))
}

function velocityFromZone(zone: number, speed: number): { vx: number; vy: number } {
  const entry = ZONES[zone] ?? ZONES[4]
  const dx = entry?.[0] ?? 1
  const dy = entry?.[1] ?? -6
  return project(dx, dy, speed)
}

function project(dx: number, dy: number, speed: number): { vx: number; vy: number } {
  const mag2 = dx * dx + dy * dy
  if (mag2 === 0) return { vx: 0, vy: -speed }
  const vx = Math.sign(dx) * isqrt(Math.floor((speed * speed * dx * dx) / mag2))
  let vy = Math.sign(dy) * isqrt(Math.floor((speed * speed * dy * dy) / mag2))
  if (vy === 0) vy = dy < 0 ? -1 : 1
  return { vx, vy }
}

function rescale(ball: Ball, speed: number): Ball {
  if (ball.stuck || (ball.vx === 0 && ball.vy === 0)) return ball
  const vel = project(ball.vx, ball.vy, speed)
  return { ...ball, vx: vel.vx, vy: vel.vy }
}

function makeStuck(paddleX: number, wide: boolean, id: number): Ball {
  const stuckOffset = Math.floor((paddleWidth(wide) * SUB) / 2)
  return {
    id,
    x: paddleX + stuckOffset,
    y: (PADDLE_Y - BALL_R) * SUB,
    vx: 0,
    vy: 0,
    stuck: true,
    stuckOffset,
  }
}

function placeStuck(ball: Ball, paddleX: number, wide: boolean): Ball {
  const stuckOffset = clampOffset(ball.stuckOffset, wide)
  return {
    ...ball,
    stuck: true,
    stuckOffset,
    x: paddleX + stuckOffset,
    y: (PADDLE_Y - BALL_R) * SUB,
  }
}

function launchBall(ball: Ball, paddleX: number, wide: boolean, speed: number): Ball {
  const stuckOffset = clampOffset(ball.stuckOffset, wide)
  const vel = velocityFromZone(zoneIndex(stuckOffset, wide), speed)
  return {
    ...ball,
    stuck: false,
    stuckOffset,
    x: paddleX + stuckOffset,
    y: (PADDLE_Y - BALL_R) * SUB,
    vx: vel.vx,
    vy: vel.vy,
  }
}

function brickBox(brick: Brick) {
  const left = (FIELD_X + brick.col * BRICK_W) * SUB
  const top = (FIELD_TOP + brick.row * BRICK_H) * SUB
  return { left, top, right: left + BRICK_W * SUB, bottom: top + BRICK_H * SUB }
}

function overlapsBrick(x: number, y: number, brick: Brick): boolean {
  const box = brickBox(brick)
  const reach = BALL_R * SUB
  return x + reach > box.left && x - reach < box.right && y + reach > box.top && y - reach < box.bottom
}

function overlappingBrick(bricks: Brick[], x: number, y: number): Brick | null {
  let best: Brick | null = null
  let bestDist = 0
  for (const brick of bricks) {
    if (!overlapsBrick(x, y, brick)) continue
    const box = brickBox(brick)
    const dx = x - (box.left + (BRICK_W * SUB) / 2)
    const dy = y - (box.top + (BRICK_H * SUB) / 2)
    const dist = dx * dx + dy * dy
    if (!best || dist < bestDist) {
      best = brick
      bestDist = dist
    }
  }
  return best
}

function overlapsPaddle(x: number, y: number, paddleX: number, wide: boolean): boolean {
  const reach = BALL_R * SUB
  const left = paddleX
  const right = paddleX + paddleWidth(wide) * SUB
  const top = PADDLE_Y * SUB
  const bottom = (PADDLE_Y + PADDLE_H) * SUB
  return x + reach > left && x - reach < right && y + reach > top && y - reach < bottom
}

function roundClear(bricks: Brick[]): boolean {
  for (const brick of bricks) {
    if (brick.kind !== "gold") return false
  }
  return true
}

function thresholds(score: number): number {
  if (score < LIFE_SCORE) return 0
  return 1 + Math.floor((score - LIFE_SCORE) / LIFE_GAP)
}

function grantLives(before: number, after: number, lives: number): number {
  const gain = thresholds(after) - thresholds(before)
  if (gain <= 0) return lives
  return Math.min(MAX_LIVES, lives + gain)
}

function spawnCapsule(draft: Draft, brick: Brick): void {
  if (draft.capsule || draft.disruption || draft.cleared) return
  const [roll, seed] = randomInt(draft.seed, 8)
  draft.seed = seed
  if (roll === 0) return
  const kind = CAPSULE_KINDS[roll - 1]
  if (!kind) return
  draft.capsule = {
    kind,
    x: (FIELD_X + brick.col * BRICK_W) * SUB,
    y: (FIELD_TOP + brick.row * BRICK_H) * SUB,
  }
}

function hitBrick(draft: Draft, brick: Brick, fromBall: boolean, seen: Set<string>): void {
  const key = `${brick.col}:${brick.row}`
  if (seen.has(key)) return
  seen.add(key)
  const index = draft.bricks.findIndex((item) => item.col === brick.col && item.row === brick.row)
  if (index < 0) return
  const target = draft.bricks[index]
  if (!target) return
  if (target.kind !== "gold") {
    if (target.hits > 1) {
      const next = draft.bricks.slice()
      next[index] = { ...target, hits: target.hits - 1 }
      draft.bricks = next
    } else {
      draft.bricks = draft.bricks.filter((_, item) => item !== index)
      const colorPoints = COLOR_SCORE[target.color]
      draft.score += target.kind === "silver" ? 50 * draft.level : colorPoints
      if (roundClear(draft.bricks)) draft.cleared = true
      else spawnCapsule(draft, target)
    }
  }
  if (fromBall) {
    draft.speed = Math.min(MAX_SPEED, draft.speed + SPEED_STEP)
    draft.slow = false
  }
}

function moveBall(
  ball: Ball,
  draft: Draft,
  paddleX: number,
  wide: boolean,
  catchOn: boolean,
): Ball | null {
  let x = ball.x
  let y = ball.y
  let vx = ball.vx
  let vy = ball.vy
  let xLeft = Math.abs(vx)
  let yLeft = Math.abs(vy)
  const xSign = vx < 0 ? -1 : vx > 0 ? 1 : 0
  const ySign = vy < 0 ? -1 : vy > 0 ? 1 : 0
  const seen = new Set<string>()
  let stuck = false
  let stuckOffset = ball.stuckOffset
  const minX = (FIELD_X + BALL_R) * SUB
  const maxX = (FIELD_RIGHT - BALL_R) * SUB
  const minY = (CEILING + BALL_R) * SUB
  const loseY = (PADDLE_Y + PADDLE_H) * SUB

  for (let guard = 0; guard < 64 && (xLeft > 0 || yLeft > 0); guard += 1) {
    if (draft.cleared) break
    if (xLeft >= yLeft && xLeft > 0) {
      const step = Math.min(SUB, xLeft)
      xLeft -= step
      const next = x + step * xSign
      const brick = overlappingBrick(draft.bricks, next, y)
      if (brick) {
        vx = -vx
        xLeft = 0
        hitBrick(draft, brick, true, seen)
        continue
      }
      if (next < minX) {
        x = minX
        vx = Math.abs(vx)
        xLeft = 0
        continue
      }
      if (draft.gate && next >= GATE_X * SUB) {
        draft.score += GATE_SCORE
        draft.cleared = true
        return null
      }
      if (!draft.gate && next > maxX) {
        x = maxX
        vx = -Math.abs(vx)
        xLeft = 0
        continue
      }
      x = next
      continue
    }

    const step = Math.min(SUB, yLeft)
    yLeft -= step
    const next = y + step * ySign
    const brick = overlappingBrick(draft.bricks, x, next)
    if (brick) {
      vy = -vy
      yLeft = 0
      hitBrick(draft, brick, true, seen)
      continue
    }
    if (next < minY) {
      y = minY
      vy = Math.abs(vy)
      yLeft = 0
      continue
    }
    if (ySign > 0 && overlapsPaddle(x, next, paddleX, wide)) {
      xLeft = 0
      yLeft = 0
      if (catchOn) {
        stuck = true
        stuckOffset = clampOffset(x - paddleX, wide)
        x = paddleX + stuckOffset
        y = (PADDLE_Y - BALL_R) * SUB
        break
      }
      const travel = draft.slow ? SLOW_SPEED : draft.speed
      const vel = velocityFromZone(zoneIndex(x - paddleX, wide), travel)
      vx = vel.vx
      vy = vel.vy
      y = (PADDLE_Y - BALL_R) * SUB
      break
    }
    if (next > loseY) return null
    y = next
  }

  return { ...ball, x, y, vx, vy, stuck, stuckOffset }
}

function laserBrick(bricks: Brick[], x: number, yTop: number, yBottom: number): Brick | null {
  let best: Brick | null = null
  let bestBottom = -1
  for (const brick of bricks) {
    const box = brickBox(brick)
    if (x < box.left || x >= box.right) continue
    if (yBottom < box.top || yTop > box.bottom) continue
    if (box.bottom > bestBottom) {
      best = brick
      bestBottom = box.bottom
    }
  }
  return best
}

function moveLaser(laser: Laser, draft: Draft): Laser | null {
  const nextY = laser.y - LASER_SPEED
  const brick = laserBrick(draft.bricks, laser.x, nextY, laser.y)
  if (brick) {
    hitBrick(draft, brick, false, new Set())
    return null
  }
  if (nextY <= CEILING * SUB) return null
  return { x: laser.x, y: nextY }
}

function spawnLasers(lasers: Laser[], paddleX: number, wide: boolean): Laser[] {
  const room = LASER_CAP - lasers.length
  if (room <= 0) return lasers
  const y = PADDLE_Y * SUB
  const ends = [paddleX, paddleX + paddleWidth(wide) * SUB]
  const added: Laser[] = []
  for (const x of ends) {
    if (added.length >= room) break
    added.push({ x, y })
  }
  return [...lasers, ...added]
}

function capsuleHitsPaddle(capsule: Capsule, paddleX: number, wide: boolean): boolean {
  const left = capsule.x
  const right = capsule.x + CAPSULE_W * SUB
  const top = capsule.y
  const bottom = capsule.y + CAPSULE_H * SUB
  const pLeft = paddleX
  const pRight = paddleX + paddleWidth(wide) * SUB
  const pTop = PADDLE_Y * SUB
  const pBottom = (PADDLE_Y + PADDLE_H) * SUB
  return left < pRight && right > pLeft && top < pBottom && bottom > pTop
}

function dropCapsule(capsule: Capsule, paddleX: number, wide: boolean): Capsule | "hit" | null {
  const moved = { ...capsule, y: capsule.y + SUB }
  if (capsuleHitsPaddle(moved, paddleX, wide)) return "hit"
  if (moved.y > (PADDLE_Y + PADDLE_H) * SUB) return null
  return moved
}

function settle(paddleX: number, wide: boolean, balls: Ball[]): { paddleX: number; balls: Ball[] } {
  const nextX = clampPaddle(paddleX, wide)
  return {
    paddleX: nextX,
    balls: balls.map((ball) => (ball.stuck ? placeStuck(ball, nextX, wide) : ball)),
  }
}

function clearMutex(game: Game, keep: "slow" | "catch" | "expand" | "laser"): Game {
  const next: Game = {
    ...game,
    slow: keep === "slow",
    catchOn: keep === "catch",
    wide: keep === "expand",
    laser: keep === "laser",
    capsule: null,
  }
  if (keep === "slow") {
    return { ...next, balls: next.balls.map((ball) => rescale(ball, SLOW_SPEED)) }
  }
  if (game.slow) {
    return { ...next, balls: next.balls.map((ball) => rescale(ball, game.speed)) }
  }
  return next
}

function disrupt(game: Game): Game {
  const ball = game.balls[0]
  if (!ball || game.balls.length !== 1) return { ...game, capsule: null }
  const speed = game.slow ? SLOW_SPEED : game.speed
  const origin = ball.stuck ? launchBall(ball, game.paddleX, game.wide, speed) : ball
  const left = velocityFromZone(0, speed)
  const right = velocityFromZone(7, speed)
  return {
    ...game,
    capsule: null,
    disruption: true,
    nextId: game.nextId + 2,
    balls: [
      origin,
      { ...origin, id: game.nextId, vx: left.vx, vy: left.vy, stuck: false },
      { ...origin, id: game.nextId + 1, vx: right.vx, vy: right.vy, stuck: false },
    ],
  }
}

function applyCapsule(game: Game, kind: CapsuleKind): Game {
  switch (kind) {
    case "slow":
    case "catch":
    case "expand":
    case "laser":
      return clearMutex(game, kind === "catch" ? "catch" : kind)
    case "break":
      return { ...game, gate: true, capsule: null }
    case "player":
      return { ...game, lives: Math.min(MAX_LIVES, game.lives + 1), capsule: null }
    case "disruption":
      return disrupt(game)
  }
}

function openRound(game: Game): Game {
  const paddleX = centeredPaddle(false)
  return {
    ...game,
    status: "playing",
    bricks: bricksFor(game.level),
    balls: [makeStuck(paddleX, false, 1)],
    paddleX,
    wide: false,
    capsule: null,
    lasers: [],
    laser: false,
    catchOn: false,
    slow: false,
    gate: false,
    disruption: false,
    timer: 0,
    fireWasDown: false,
    nextId: 2,
    speed: BASE_SPEED,
  }
}

function respawn(game: Game): Game {
  const paddleX = centeredPaddle(false)
  return {
    ...game,
    status: "playing",
    balls: [makeStuck(paddleX, false, game.nextId)],
    paddleX,
    wide: false,
    capsule: null,
    lasers: [],
    laser: false,
    catchOn: false,
    slow: false,
    gate: false,
    disruption: false,
    timer: 0,
    fireWasDown: false,
    nextId: game.nextId + 1,
  }
}

function advanceBeat(game: Game): Game {
  if (game.timer > 1) return { ...game, timer: game.timer - 1 }
  if (game.status === "cleared") return openRound({ ...game, level: game.level + 1 })
  const lives = game.lives - 1
  if (lives <= 0) return { ...game, status: "over", lives: 0, timer: 0 }
  return respawn({ ...game, lives })
}

export function createGame(seed: number): Game {
  const baseSeed = seed | 0
  const paddleX = centeredPaddle(false)
  return {
    status: "ready",
    level: 1,
    score: 0,
    lives: START_LIVES,
    bricks: bricksFor(1),
    balls: [makeStuck(paddleX, false, 1)],
    paddleX,
    wide: false,
    capsule: null,
    lasers: [],
    laser: false,
    catchOn: false,
    slow: false,
    gate: false,
    disruption: false,
    timer: 0,
    fireWasDown: false,
    seed: baseSeed,
    baseSeed,
    nextId: 2,
    speed: BASE_SPEED,
  }
}

export function start(game: Game): Game {
  if (game.status === "cleared") return openRound({ ...game, level: game.level + 1 })
  if (game.status !== "ready" && game.status !== "paused") return game
  return { ...game, status: "playing" }
}

export function pause(game: Game): Game {
  if (game.status !== "playing") return game
  return { ...game, status: "paused" }
}

function play(game: Game, input: Input): Game {
  const wideNow = game.wide
  let paddleX = clampPaddle(game.paddleX, wideNow)
  if (input.left) paddleX -= PADDLE_SPEED
  if (input.right) paddleX += PADDLE_SPEED
  paddleX = clampPaddle(paddleX, wideNow)

  let balls = game.balls.map((ball) => (ball.stuck ? placeStuck(ball, paddleX, wideNow) : ball))
  const fireRise = input.fire && !game.fireWasDown
  const travel = game.slow ? SLOW_SPEED : game.speed
  if (fireRise) {
    balls = balls.map((ball) => (ball.stuck ? launchBall(ball, paddleX, wideNow, travel) : ball))
  }

  const draft: Draft = {
    bricks: game.bricks,
    score: game.score,
    seed: game.seed,
    capsule: game.capsule,
    speed: game.speed,
    slow: game.slow,
    cleared: false,
    gate: game.gate,
    disruption: game.disruption,
    level: game.level,
  }

  let lasers = fireRise && game.laser ? spawnLasers(game.lasers, paddleX, wideNow) : game.lasers
  const movedLasers: Laser[] = []
  for (const laser of lasers) {
    if (draft.cleared) break
    const moved = moveLaser(laser, draft)
    if (moved) movedLasers.push(moved)
  }
  lasers = movedLasers

  const speedBefore = draft.speed
  const slowBefore = draft.slow
  const kept: Ball[] = []
  if (!draft.cleared) {
    for (const ball of balls) {
      if (draft.cleared) {
        kept.push(ball)
        continue
      }
      if (ball.stuck) {
        kept.push(ball)
        continue
      }
      const moved = moveBall(ball, draft, paddleX, wideNow, game.catchOn)
      if (moved) kept.push(moved)
    }
  } else {
    kept.push(...balls)
  }
  balls = kept
  if (draft.speed !== speedBefore || draft.slow !== slowBefore) {
    const nextSpeed = draft.slow ? SLOW_SPEED : draft.speed
    balls = balls.map((ball) => rescale(ball, nextSpeed))
  }

  let wide = game.wide
  let laser = game.laser
  let catchOn = game.catchOn
  let gate = draft.gate
  let disruption = draft.disruption
  let lives = game.lives
  let nextId = game.nextId
  let slow = draft.slow
  let capsule = draft.capsule

  if (!draft.cleared && capsule) {
    const dropped = dropCapsule(capsule, paddleX, wide)
    if (dropped === "hit") {
      const applied = applyCapsule(
        {
          ...game,
          balls,
          paddleX,
          score: draft.score,
          seed: draft.seed,
          speed: draft.speed,
          slow,
          lives,
          nextId,
          wide,
          laser,
          catchOn,
          gate,
          disruption,
          capsule,
        },
        capsule.kind,
      )
      balls = applied.balls
      wide = applied.wide
      laser = applied.laser
      catchOn = applied.catchOn
      gate = applied.gate
      disruption = applied.disruption
      lives = applied.lives
      nextId = applied.nextId
      slow = applied.slow
      capsule = null
    } else {
      capsule = dropped
    }
  }

  if (disruption && balls.length <= 1) disruption = false
  const settled = settle(paddleX, wide, balls)
  paddleX = settled.paddleX
  balls = settled.balls
  lives = grantLives(game.score, draft.score, lives)

  const shared = {
    score: draft.score,
    lives,
    bricks: draft.bricks,
    balls,
    paddleX,
    wide,
    capsule: draft.cleared ? null : capsule,
    lasers: draft.cleared ? [] : lasers,
    laser,
    catchOn,
    slow,
    gate,
    disruption,
    fireWasDown: input.fire,
    seed: draft.seed,
    speed: draft.speed,
    nextId,
  }

  if (draft.cleared) {
    return { ...game, ...shared, status: "cleared", timer: CLEARED_TICKS }
  }
  if (balls.length === 0) {
    if (lives <= 1) {
      return { ...game, ...shared, status: "over", lives: 0, timer: 0, balls: [], lasers: [], capsule: null }
    }
    return {
      ...game,
      ...shared,
      status: "dying",
      timer: DYING_TICKS,
      balls: [],
      lasers: [],
      capsule: null,
    }
  }
  return { ...game, ...shared }
}

export function step(game: Game, input: Input): Game {
  if (game.status === "dying" || game.status === "cleared") return advanceBeat(game)
  if (game.status !== "playing") return game
  return play(game, input)
}
