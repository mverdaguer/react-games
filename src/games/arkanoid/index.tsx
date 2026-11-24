import { Volume2, VolumeX } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Leaderboard } from "@/components/Leaderboard"
import { Button } from "@/components/ui/button"
import { Device } from "@/games/arkanoid/Device"
import type { Status } from "@/games/arkanoid/logic"
import { Screen } from "@/games/arkanoid/Screen"
import { useArkanoidGame } from "@/games/arkanoid/useArkanoidGame"

function primaryLabel(status: Status) {
  switch (status) {
    case "ready":
      return "Start"
    case "playing":
      return "Pause"
    case "dying":
    case "cleared":
      return "Wait"
    case "paused":
      return "Resume"
    case "over":
      return "New game"
  }
}

function statusText(status: Status, score: number, level: number, isNewBest: boolean) {
  switch (status) {
    case "ready":
      return "Arrows or A and D move, Space launches the ball. Press Enter or Start."
    case "playing":
      return "Press Esc or Enter to pause."
    case "paused":
      return "Paused. Press Esc or Enter to resume."
    case "dying":
      return "Missed. Get ready."
    case "cleared":
      return `Round ${level} clear.`
    case "over":
      return `Game over · ${score} points${isNewBest ? " · New best!" : ""}`
  }
}

export default function Arkanoid() {
  const { game, settings, best, newBest, run, holdMove, holdFire, primary, setAim, tapFire, toggleSound } =
    useArkanoidGame()

  return (
    <GameShell
      toolbar={
        <>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {best === null ? "Best —" : `Best ${best.score}`}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {best === null ? "Round —" : `Round ${best.level}`}
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
          screen={<Screen game={game} best={best?.score ?? null} />}
          primaryLabel={primaryLabel(game.status)}
          onHoldStart={(dir) => holdMove(dir, true)}
          onHoldEnd={(dir) => holdMove(dir, false)}
          onFire={holdFire}
          onPrimary={primary}
          onAim={setAim}
          onTap={tapFire}
        />
        <p className="text-sm font-medium" aria-live="polite">
          {statusText(game.status, game.score, game.level, newBest)}
        </p>
        <Leaderboard game="arkanoid" run={run} />
      </div>
    </GameShell>
  )
}
