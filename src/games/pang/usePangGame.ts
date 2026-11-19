import { useEffect, useEffectEvent, useRef, useState } from "react"

import {
  createGame,
  pause,
  start,
  step,
  type Game,
  type Input,
} from "@/games/pang/logic"
import { playSound } from "@/games/pang/sound"
import {
  loadBest,
  loadSettings,
  saveBest,
  saveSettings,
  type Best,
} from "@/games/pang/storage"

const STEP_MS = 1000 / 60
const MAX_STEPS = 3

export type MoveDir = "left" | "right"

const IDLE_INPUT: Input = { left: false, right: false, fire: false }

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32)
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

export function usePangGame() {
  const [settings, setSettings] = useState(loadSettings)
  const [best, setBest] = useState<Best | null>(loadBest)
  const [newBest, setNewBest] = useState(false)
  const [game, setGame] = useState(() => createGame(newSeed()))
  const gameRef = useRef(game)
  const settingsRef = useRef(settings)
  const bestRef = useRef(best)
  const inputRef = useRef<Input>({ ...IDLE_INPUT })
  const pulseRef = useRef(false)
  const keyboardFocusRef = useRef(false)
  const movePulseRef = useRef({ left: false, right: false })
  const clockRef = useRef({ last: 0, acc: 0 })

  function releaseInput() {
    inputRef.current = { ...IDLE_INPUT }
    pulseRef.current = false
    movePulseRef.current = { left: false, right: false }
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
        if (next.shots.length > prev.shots.length) playSound("shoot")
        if (next.balls.length < prev.balls.length || next.score > prev.score) playSound("pop")
        const boosted =
          next.weapon !== prev.weapon ||
          next.volley > prev.volley ||
          (next.shield && !prev.shield) ||
          next.freeze > prev.freeze ||
          next.slow > prev.slow ||
          next.lives > prev.lives
        if (boosted) playSound("boost")
      }
    }

    if (next.status === "over" && prev.status !== "over") {
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
      commit(start(createGame(newSeed())))
    }
  }

  function onScreen(held: boolean) {
    if (gameRef.current.status !== "playing") {
      if (!held) primary()
      return
    }
    holdFire(held)
  }

  function toggleSound() {
    const next = { ...settingsRef.current, sound: !settingsRef.current.sound }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }

  const onFrame = useEffectEvent((now: number) => {
    const clock = clockRef.current
    if (clock.last === 0) clock.last = now
    clock.acc += Math.min(100, now - clock.last)
    clock.last = now

    const input: Input = {
      left: inputRef.current.left || movePulseRef.current.left,
      right: inputRef.current.right || movePulseRef.current.right,
      fire: inputRef.current.fire || pulseRef.current,
    }

    let next = gameRef.current
    let guard = 0
    while (clock.acc >= STEP_MS && guard < MAX_STEPS) {
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
    holdMove,
    holdFire,
    primary,
    onScreen,
    toggleSound,
  }
}
