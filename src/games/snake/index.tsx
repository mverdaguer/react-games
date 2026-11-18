import { Minus, Plus, Volume2, VolumeX } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Button } from "@/components/ui/button"
import { Device } from "@/games/snake/Device"
import { Keypad } from "@/games/snake/Keypad"
import type { Level, Status } from "@/games/snake/logic"
import { Screen } from "@/games/snake/Screen"
import { useSnakeGame } from "@/games/snake/useSnakeGame"

function primaryLabel(status: Status) {
  switch (status) {
    case "ready":
      return "Start"
    case "playing":
      return "Pause"
    case "paused":
      return "Resume"
    case "over":
    case "won":
      return "New game"
  }
}

function statusText(status: Status, score: number, isNewBest: boolean) {
  switch (status) {
    case "ready":
      return "Steer with the arrow keys, swipes or the keypad. Press Space or 5 to start."
    case "playing":
      return "Walls wrap around. Press Space or 5 to pause."
    case "paused":
      return "Paused. Press Space or 5 to resume."
    case "over":
      return `Game over · ${score} points${isNewBest ? " · New best!" : ""}. Press Space or 5 to play again.`
    case "won":
      return `You filled the screen · ${score} points${isNewBest ? " · New best!" : ""}.`
  }
}

export default function Snake() {
  const { game, settings, bestScores, newBest, steer, primary, setLevel, toggleSound } = useSnakeGame()
  const best = bestScores[settings.level]
  const label = primaryLabel(game.status)

  function tapAction() {
    if (game.status === "playing") return
    primary()
  }

  return (
    <GameShell
      toolbar={
        <>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Slower"
            disabled={settings.level === 1}
            onClick={() => {
              if (settings.level > 1) setLevel((settings.level - 1) as Level)
            }}
          >
            <Minus aria-hidden />
          </Button>
          <span>Level {settings.level}</span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Faster"
            disabled={settings.level === 9}
            onClick={() => {
              if (settings.level < 9) setLevel((settings.level + 1) as Level)
            }}
          >
            <Plus aria-hidden />
          </Button>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {best === undefined ? "Best —" : `Best ${best}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Sound"
            aria-pressed={settings.sound}
            onClick={toggleSound}
          >
            {settings.sound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          </Button>
        </>
      }
    >
      <div className="flex w-full flex-col items-center gap-4">
        <Device
          screen={<Screen game={game} />}
          keypad={<Keypad onDirection={steer} onPrimary={primary} primaryLabel={label} />}
          onSwipe={steer}
          onTap={tapAction}
        />
        <p className="text-sm font-medium" aria-live="polite">
          {statusText(game.status, game.score, newBest)}
        </p>
      </div>
    </GameShell>
  )
}
