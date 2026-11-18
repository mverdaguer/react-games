import { useEffect, useEffectEvent, useRef, useState } from "react"

import {
  createGame,
  pause,
  queueTurn,
  start,
  step,
  tickMs,
  type Direction,
  type Game,
  type Level,
} from "@/games/snake/logic"
import { playSound } from "@/games/snake/sound"
import {
  loadBestScores,
  loadSettings,
  saveBestScore,
  saveSettings,
} from "@/games/snake/storage"

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32)
}

function numpadDirection(code: string): Direction | null {
  switch (code) {
    case "Numpad8":
      return "up"
    case "Numpad2":
      return "down"
    case "Numpad4":
      return "left"
    case "Numpad6":
      return "right"
    default:
      return null
  }
}

function directionFromKey(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
    case "2":
      return "up"
    case "ArrowDown":
    case "s":
    case "S":
    case "8":
      return "down"
    case "ArrowLeft":
    case "a":
    case "A":
    case "4":
      return "left"
    case "ArrowRight":
    case "d":
    case "D":
    case "6":
      return "right"
    default:
      return null
  }
}

function isPrimaryKey(key: string) {
  return key === " " || key === "Enter" || key === "5" || key === "p" || key === "P"
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

export function useSnakeGame() {
  const [settings, setSettings] = useState(loadSettings)
  const [bestScores, setBestScores] = useState(loadBestScores)
  const [newBest, setNewBest] = useState(false)
  const [game, setGame] = useState(() => createGame(settings.level, newSeed()))
  const gameRef = useRef(game)
  const settingsRef = useRef(settings)
  const bestScoresRef = useRef(bestScores)

  function commit(next: Game) {
    const prev = gameRef.current
    if (next === prev) return
    gameRef.current = next
    setGame(next)

    if (next.score > prev.score && settingsRef.current.sound) {
      playSound(prev.bonus !== null && next.bonus === null ? "bonus" : "eat")
    }

    if ((next.status === "over" || next.status === "won") && prev.status === "playing") {
      if (settingsRef.current.sound) playSound("die")
      const previous = bestScoresRef.current[next.level]
      const scores = saveBestScore(next.level, next.score)
      bestScoresRef.current = scores
      setBestScores(scores)
      setNewBest(previous === undefined || next.score > previous)
    }
  }

  function steer(dir: Direction) {
    const current = gameRef.current
    if (current.status === "over" || current.status === "won") return
    const turned = queueTurn(current, dir)
    if (current.status === "playing") {
      if (turned === current) return
      commit(turned)
      return
    }
    if (current.status === "ready" || current.status === "paused") {
      commit(start(turned))
    }
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
    commit(start(createGame(current.level, newSeed())))
  }

  function pauseGame() {
    commit(pause(gameRef.current))
  }

  function setLevel(level: Level) {
    if (level === settingsRef.current.level) return
    const next = { ...settingsRef.current, level }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
    setNewBest(false)
    commit(createGame(level, newSeed()))
  }

  function toggleSound() {
    const next = { ...settingsRef.current, sound: !settingsRef.current.sound }
    saveSettings(next)
    settingsRef.current = next
    setSettings(next)
  }

  const onTick = useEffectEvent(() => {
    commit(step(gameRef.current))
  })

  const onAutoPause = useEffectEvent(() => {
    commit(pause(gameRef.current))
  })

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (isFieldTarget(event.target)) return

    const fromNumpad = numpadDirection(event.code)
    if (fromNumpad) {
      event.preventDefault()
      steer(fromNumpad)
      return
    }

    if (event.code === "Numpad5") {
      if (event.repeat) return
      event.preventDefault()
      primary()
      return
    }

    const direction = directionFromKey(event.key)
    if (direction) {
      event.preventDefault()
      steer(direction)
      return
    }

    if (isPrimaryKey(event.key)) {
      if (event.repeat) return
      if ((event.key === " " || event.key === "Enter") && isActivationTarget(event.target)) return
      event.preventDefault()
      primary()
      return
    }

    if (event.key === "Escape") {
      if (event.repeat) return
      event.preventDefault()
      pauseGame()
    }
  })

  useEffect(() => {
    if (game.status !== "playing") return
    const id = window.setInterval(onTick, tickMs(game.level))
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
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return { game, settings, bestScores, newBest, steer, primary, pauseGame, setLevel, toggleSound }
}
