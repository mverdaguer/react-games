import { useEffect, useEffectEvent, useRef, useState } from "react"

import {
  createGame,
  PADDLE_W,
  PADDLE_WIDE,
  pause,
  start,
  step,
  SUB,
  type Difficulty,
  type Game,
  type Input,
} from "@/games/arkanoid/logic"
import { maskFromInput } from "@/games/arkanoid/replay"
import { playSound } from "@/games/arkanoid/sound"
import {
  loadBest,
  loadSettings,
  saveBest,
  saveSettings,
  type Best,
} from "@/games/arkanoid/storage"
import { pastTickLimit, recordInput, type RecordedRun } from "@/games/shared/leaderboard"
import type { LogEntry } from "@/games/shared/replay"

const STEP_MS = 1000 / 60
const MAX_STEPS = 3

export type MoveDir = "left" | "right"

const IDLE_INPUT: Input = { left: false, right: false, fire: false }

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32)
}

type RunLog = {
  seed: number
  difficulty: Difficulty
  log: LogEntry[]
  ticks: number
  mask: number
  limited: boolean
}

const COUNTED = new Set<Game["status"]>(["playing", "dying", "cleared"])

function isFieldTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  )
}

function isActivationTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a, [role=button]") !== null
}

function isKeyboardActivation(target: EventTarget | null, fromKeyboard: boolean) {
  return (
    fromKeyboard &&
    target instanceof HTMLElement &&
    target.matches(":focus-visible") &&
    isActivationTarget(target)
  )
}

function isFireKey(key: string) {
  return key === " " || key === "ArrowUp" || key === "x" || key === "X"
}

function moveDirFromKey(key: string): MoveDir | null {
  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    default:
      return null
  }
}

function brickKey(col: number, row: number) {
  return `${col}:${row}`
}

function brickSound(prev: Game, next: Game): "silver" | "brick" | null {
  const before = new Map<string, number>()
  for (const brick of prev.bricks) before.set(brickKey(brick.col, brick.row), brick.hits)
  let fewerHits = false
  const seen = new Set<string>()
  for (const brick of next.bricks) {
    const key = brickKey(brick.col, brick.row)
    seen.add(key)
    const hits = before.get(key)
    if (hits !== undefined && brick.hits < hits) fewerHits = true
  }
  if (fewerHits) return "silver"
  if (next.score <= prev.score) return null
  for (const key of before.keys()) {
    if (!seen.has(key)) return "brick"
  }
  return null
}

function bounced(prev: Game, next: Game) {
  const before = new Map(prev.balls.map((ball) => [ball.id, ball]))
  for (const ball of next.balls) {
    const prior = before.get(ball.id)
    if (!prior) continue
    const vyFlipped = prior.vy > 0 && ball.vy < 0
    const vxFlipped = (prior.vx > 0 && ball.vx < 0) || (prior.vx < 0 && ball.vx > 0)
    if (vyFlipped || vxFlipped) return true
  }
  return false
}

export function useArkanoidGame() {
  const [settings, setSettings] = useState(loadSettings)
  const [best, setBest] = useState<Best | null>(loadBest)
  const [newBest, setNewBest] = useState(false)
  const [seed] = useState(newSeed)
  const runRef = useRef<RunLog>({
    seed,
    difficulty: settings.difficulty,
    log: [],
    ticks: 0,
    mask: 0,
    limited: false,
  })
  const [run, setRun] = useState<RecordedRun | null>(null)
  const [game, setGame] = useState(() => createGame(seed, settings.difficulty))
  const gameRef = useRef(game)
  const settingsRef = useRef(settings)
  const bestRef = useRef(best)
  const inputRef = useRef<Input>({ ...IDLE_INPUT })
  const pulseRef = useRef(false)
  const keyboardFocusRef = useRef(false)
  const movePulseRef = useRef({ left: false, right: false })
  const aimRef = useRef<number | null>(null)
  const clockRef = useRef({ last: 0, acc: 0 })

  function startRun(difficulty: Difficulty) {
    const seed = newSeed()
    runRef.current = { seed, difficulty, log: [], ticks: 0, mask: 0, limited: false }
    return createGame(seed, difficulty)
  }

  function releaseInput() {
    inputRef.current = { ...IDLE_INPUT }
    pulseRef.current = false
    movePulseRef.current = { left: false, right: false }
    aimRef.current = null
  }

  function commit(next: Game) {
    const prev = gameRef.current
    if (next === prev) return
    gameRef.current = next
    if (prev.status === "playing" && next.status !== "playing") releaseInput()
    setGame(next)

    if (settingsRef.current.sound) {
      if (prev.status === "playing" && next.status === "dying") playSound("die")
      else if (prev.status !== "cleared" && next.status === "cleared") playSound("clear")
      else if (next.status === "playing") {
        const hit = brickSound(prev, next)
        if (hit) playSound(hit)
        if (prev.capsule === null && next.capsule !== null) playSound("capsule")
        if (next.lasers.length > prev.lasers.length) playSound("laser")
        if (bounced(prev, next)) playSound("bounce")
      }
    }

    if (next.status === "over" && prev.status !== "over") {
      const recorded = runRef.current
      setRun({
        game: "arkanoid",
        level: recorded.difficulty === "hard" ? 1 : 0,
        seed: recorded.seed,
        score: next.score,
        log: recorded.log.slice(),
        unranked: recorded.limited || pastTickLimit("arkanoid", recorded.ticks) ? "too-long" : null,
      })
      const previous = bestRef.current
      const scores = saveBest(next.score, next.level)
      bestRef.current = scores
      setBest(scores)
      setNewBest(previous === null || next.score > previous.score)
    }
  }

  function holdMove(dir: MoveDir, held: boolean) {
    inputRef.current = { ...inputRef.current, [dir]: held }
    if (held) movePulseRef.current = { ...movePulseRef.current, [dir]: true }
  }

  function holdFire(held: boolean) {
    inputRef.current = { ...inputRef.current, fire: held }
    if (held) pulseRef.current = true
  }

  function tapFire() {
    pulseRef.current = true
  }

  function setAim(x: number | null) {
    aimRef.current = x
  }

  function primary() {
    const current = gameRef.current
    if (current.status === "ready" || current.status === "paused") {
      commit(start(current))
      return
    }
    if (current.status === "playing") {
      commit(pause(current))
      return
    }
    if (current.status === "over") {
      setNewBest(false)
      releaseInput()
      setRun(null)
      commit(start(startRun(settingsRef.current.difficulty)))
    }
  }

  function setDifficulty(difficulty: Difficulty) {
    if (difficulty === settingsRef.current.difficulty) return
    const next = { ...settingsRef.current, difficulty }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
    setNewBest(false)
    releaseInput()
    setRun(null)
    commit(startRun(difficulty))
  }

  function toggleSound() {
    const next = { ...settingsRef.current, sound: !settingsRef.current.sound }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }

  function frameInput(current: Game): Input {
    let left = inputRef.current.left || movePulseRef.current.left
    let right = inputRef.current.right || movePulseRef.current.right
    const aim = aimRef.current
    if (typeof aim === "number" && current.status === "playing") {
      const width = current.wide ? PADDLE_WIDE : PADDLE_W
      const center = current.paddleX / SUB + width / 2
      if (aim < center - 1) left = true
      else if (aim > center + 1) right = true
    }
    return {
      left,
      right,
      fire: inputRef.current.fire || pulseRef.current,
    }
  }

  const onFrame = useEffectEvent((now: number) => {
    const clock = clockRef.current
    if (clock.last === 0) clock.last = now
    clock.acc += Math.min(100, now - clock.last)
    clock.last = now

    const input = frameInput(gameRef.current)

    let next = gameRef.current
    let guard = 0
    while (clock.acc >= STEP_MS && guard < MAX_STEPS) {
      if (COUNTED.has(next.status)) {
        const run = runRef.current
        const mask = maskFromInput(input)
        if (mask !== run.mask) {
          if (!run.limited && !recordInput("arkanoid", run.log, run.ticks, mask)) run.limited = true
          run.mask = mask
        }
        run.ticks += 1
        if (pastTickLimit("arkanoid", run.ticks)) run.limited = true
      }
      next = step(next, input)
      clock.acc -= STEP_MS
      guard += 1
    }
    if (guard === MAX_STEPS) clock.acc = 0
    if (guard > 0) {
      pulseRef.current = false
      movePulseRef.current = { left: false, right: false }
    }
    commit(next)
  })

  const onAutoPause = useEffectEvent(() => {
    releaseInput()
    commit(pause(gameRef.current))
  })

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Tab") keyboardFocusRef.current = true
    if (event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (isFieldTarget(event.target)) return

    const dir = moveDirFromKey(event.key)
    if (dir) {
      event.preventDefault()
      holdMove(dir, true)
      return
    }

    if (isFireKey(event.key)) {
      const status = gameRef.current.status
      const starts = event.key === " " && (status === "ready" || status === "over")
      if (starts) {
        if (isKeyboardActivation(event.target, keyboardFocusRef.current)) return
        event.preventDefault()
        if (event.repeat) return
        primary()
        return
      }
      if (event.key === " " && isKeyboardActivation(event.target, keyboardFocusRef.current)) return
      event.preventDefault()
      holdFire(true)
      return
    }

    if (event.key === "Enter" || event.key === "p" || event.key === "P") {
      if (event.key === "Enter" && isKeyboardActivation(event.target, keyboardFocusRef.current)) return
      event.preventDefault()
      if (event.repeat) return
      primary()
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (event.repeat) return
      const status = gameRef.current.status
      if (status === "playing") commit(pause(gameRef.current))
      else if (status === "paused") commit(start(gameRef.current))
    }
  })

  const onKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (isFieldTarget(event.target)) return
    const dir = moveDirFromKey(event.key)
    if (dir) {
      event.preventDefault()
      holdMove(dir, false)
      return
    }
    if (isFireKey(event.key)) {
      event.preventDefault()
      holdFire(false)
    }
  })

  useEffect(() => {
    let frame = 0
    const loop = (now: number) => {
      onFrame(now)
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onBlur() {
      onAutoPause()
    }
    function onVisibility() {
      if (document.hidden) onAutoPause()
    }
    window.addEventListener("blur", onBlur)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  useEffect(() => {
    function onPointerDown() {
      keyboardFocusRef.current = false
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("pointerdown", onPointerDown, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("pointerdown", onPointerDown, true)
    }
  }, [])

  return {
    game,
    settings,
    best,
    newBest,
    run,
    holdMove,
    holdFire,
    primary,
    setAim,
    tapFire,
    toggleSound,
    setDifficulty,
  }
}
