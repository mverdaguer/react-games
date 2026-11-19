import { useEffect, useEffectEvent, useRef, useState } from "react"

import {
  createGame,
  gravityMs,
  move,
  pause,
  rotate as rotatePiece,
  softDrop,
  start,
  tick,
  type Game,
} from "@/games/tetris/logic"
import { playSound } from "@/games/tetris/sound"
import {
  loadBestScores,
  loadSettings,
  saveBestScore,
  saveSettings,
  type StartLevel,
} from "@/games/tetris/storage"

const DAS_DELAY = 267
const DAS_REPEAT = 100
const MAX_DRAG_STEPS = 4

type HoldDir = "left" | "right" | "down"
type RotateDir = "cw" | "ccw"
type LockSound = "die" | "tetris" | "line" | "lock"

type RepeatSlot = {
  timeout: number | null
  interval: number | null
  generation: number
}

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32)
}

function gravityInterval(level: number): number {
  try {
    const raw = localStorage.getItem("tetris:gravity-ms")
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 1000) return parsed
    }
  } catch {
    // private mode
  }
  return gravityMs(level)
}

function isStartLevel(level: number): level is StartLevel {
  return Number.isInteger(level) && level >= 0 && level <= 9
}

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

function isPrimaryKey(key: string) {
  return key === " " || key === "Enter" || key === "p" || key === "P"
}

function holdDirFromKey(key: string): HoldDir | null {
  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    case "ArrowDown":
    case "s":
    case "S":
      return "down"
    default:
      return null
  }
}

function rotateDirFromKey(key: string): RotateDir | null {
  switch (key) {
    case "ArrowUp":
    case "x":
    case "X":
    case "w":
    case "W":
      return "cw"
    case "z":
    case "Z":
    case "q":
    case "Q":
      return "ccw"
    default:
      return null
  }
}

function dragSteps(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(MAX_DRAG_STEPS, Math.trunc(value))
}

function createSlot(): RepeatSlot {
  return { timeout: null, interval: null, generation: 0 }
}

function clearSlot(slot: RepeatSlot) {
  slot.generation += 1
  if (slot.timeout !== null) window.clearTimeout(slot.timeout)
  if (slot.interval !== null) window.clearInterval(slot.interval)
  slot.timeout = null
  slot.interval = null
}

function armSlot(slot: RepeatSlot, step: () => void) {
  clearSlot(slot)
  const generation = slot.generation
  slot.timeout = window.setTimeout(() => {
    if (generation !== slot.generation) return
    slot.timeout = null
    const interval = window.setInterval(() => {
      if (generation !== slot.generation) {
        window.clearInterval(interval)
        return
      }
      step()
    }, DAS_REPEAT)
    if (generation !== slot.generation) {
      window.clearInterval(interval)
      return
    }
    slot.interval = interval
  }, DAS_DELAY)
}

function lockSound(prev: Game, next: Game): LockSound | null {
  if (next.board === prev.board || prev.status !== "playing") return null
  if (next.status === "over") return "die"
  if (next.status !== "playing") return null
  const rows = next.lastClear?.rows.length ?? 0
  if (rows >= 4) return "tetris"
  if (rows > 0) return "line"
  return "lock"
}

export function useTetrisGame() {
  const [settings, setSettings] = useState(loadSettings)
  const [bestScores, setBestScores] = useState(loadBestScores)
  const [newBest, setNewBest] = useState(false)
  const [game, setGame] = useState(() => createGame(settings.startLevel, newSeed()))
  const gameRef = useRef(game)
  const settingsRef = useRef(settings)
  const bestScoresRef = useRef(bestScores)
  const horizontalRef = useRef(createSlot())
  const downRef = useRef(createSlot())

  function releaseHolds() {
    clearSlot(horizontalRef.current)
    clearSlot(downRef.current)
  }

  function commit(next: Game) {
    const prev = gameRef.current
    if (next === prev) return
    gameRef.current = next
    if (prev.status === "playing" && next.status !== "playing") releaseHolds()
    setGame(next)

    if (settingsRef.current.sound) {
      const kind = lockSound(prev, next)
      if (kind) playSound(kind)
    }

    if (next.status === "over" && prev.status === "playing" && isStartLevel(next.startLevel)) {
      const previous = bestScoresRef.current[next.startLevel]
      const scores = saveBestScore(next.startLevel, next.score)
      bestScoresRef.current = scores
      setBestScores(scores)
      setNewBest(previous === undefined || next.score > previous)
    }
  }

  function applyHold(dir: HoldDir) {
    const current = gameRef.current
    if (current.status !== "playing") return
    const next = dir === "left" ? move(current, -1) : dir === "right" ? move(current, 1) : softDrop(current)
    if (dir !== "down" && next !== current && settingsRef.current.sound) playSound("move")
    commit(next)
  }

  function holdStart(dir: HoldDir) {
    if (gameRef.current.status !== "playing") return
    const slot = dir === "down" ? downRef.current : horizontalRef.current
    applyHold(dir)
    armSlot(slot, () => applyHold(dir))
  }

  function holdEnd(dir: HoldDir) {
    clearSlot(dir === "down" ? downRef.current : horizontalRef.current)
  }

  function rotate(dir: RotateDir) {
    const current = gameRef.current
    if (current.status !== "playing") return
    const next = rotatePiece(current, dir)
    if (next !== current && settingsRef.current.sound) playSound("rotate")
    commit(next)
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
    setNewBest(false)
    commit(start(createGame(settingsRef.current.startLevel, newSeed())))
  }

  function pauseGame() {
    commit(pause(gameRef.current))
  }

  function onScreenTap() {
    if (gameRef.current.status === "playing") {
      rotate("cw")
      return
    }
    primary()
  }

  function onDrag(delta: { columns: number; rows: number }) {
    if (gameRef.current.status !== "playing") return
    const columnSteps = dragSteps(Math.abs(delta.columns))
    const rowSteps = dragSteps(delta.rows)
    if (columnSteps === 0 && rowSteps === 0) return

    const direction: -1 | 1 = delta.columns < 0 ? -1 : 1
    let next = gameRef.current
    let moved = false
    for (let step = 0; step < columnSteps; step += 1) {
      if (next.status !== "playing") break
      const shifted = move(next, direction)
      if (shifted !== next) moved = true
      next = shifted
    }
    for (let step = 0; step < rowSteps; step += 1) {
      if (next.status !== "playing") break
      next = softDrop(next)
    }
    if (moved && settingsRef.current.sound) playSound("move")
    commit(next)
  }

  function setStartLevel(level: StartLevel) {
    const next = { ...settingsRef.current, startLevel: level }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
    setNewBest(false)
    commit(createGame(level, newSeed()))
  }

  function togglePreview() {
    const next = { ...settingsRef.current, preview: !settingsRef.current.preview }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }

  function toggleSound() {
    const next = { ...settingsRef.current, sound: !settingsRef.current.sound }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }

  const onTick = useEffectEvent(() => {
    commit(tick(gameRef.current))
  })

  const onAutoPause = useEffectEvent(() => {
    releaseHolds()
    commit(pause(gameRef.current))
  })

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (isFieldTarget(event.target)) return

    const hold = holdDirFromKey(event.key)
    if (hold) {
      event.preventDefault()
      if (event.repeat) return
      holdStart(hold)
      return
    }

    const rotation = rotateDirFromKey(event.key)
    if (rotation) {
      event.preventDefault()
      if (event.repeat) return
      rotate(rotation)
      return
    }

    if (isPrimaryKey(event.key)) {
      if ((event.key === " " || event.key === "Enter") && isActivationTarget(event.target)) return
      event.preventDefault()
      if (event.repeat) return
      primary()
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (event.repeat) return
      pauseGame()
    }
  })

  const onKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (isFieldTarget(event.target)) return

    const hold = holdDirFromKey(event.key)
    if (!hold) return
    event.preventDefault()
    holdEnd(hold)
  })

  useEffect(() => {
    if (game.status !== "playing") return
    const id = window.setInterval(onTick, gravityInterval(game.level))
    return () => window.clearInterval(id)
  }, [game.status, game.level])

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
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  useEffect(() => {
    const horizontal = horizontalRef.current
    const down = downRef.current
    return () => {
      clearSlot(horizontal)
      clearSlot(down)
    }
  }, [])

  return {
    game,
    settings,
    bestScores,
    newBest,
    holdStart,
    holdEnd,
    rotate,
    primary,
    togglePreview,
    onScreenTap,
    onDrag,
    setStartLevel,
    toggleSound,
  }
}
