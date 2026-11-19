import { Volume2, VolumeX } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Button } from "@/components/ui/button"
import { Cabinet } from "@/games/pang/Cabinet"
import type { Status } from "@/games/pang/logic"
import { Screen } from "@/games/pang/Screen"
import { usePangGame } from "@/games/pang/usePangGame"

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
      return "Arrows or A and D move, Space fires. Press Enter or Start."
    case "playing":
      return "Press Esc or Enter to pause."
    case "paused":
      return "Paused. Press Esc or Enter to resume."
    case "dying":
      return "Hit. Get ready."
    case "cleared":
      return `Stage ${level} clear.`
    case "over":
      return `Game over · ${score} points${isNewBest ? " · New best!" : ""}.`
  }
}

export default function Pang() {
  const { game, settings, best, newBest, holdMove, holdFire, primary, onScreen, toggleSound } =
    usePangGame()

  return (
    <GameShell
      toolbar={
        <>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {best === null ? "Best —" : `Best ${best.score}`}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {best === null ? "Stage —" : `Stage ${best.level}`}
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
        <Cabinet
          screen={<Screen game={game} />}
          primaryLabel={primaryLabel(game.status)}
          onMove={holdMove}
          onFire={holdFire}
          onPrimary={primary}
          onScreen={onScreen}
        />
        <p className="text-sm font-medium" aria-live="polite">
          {statusText(game.status, game.score, game.level, newBest)}
        </p>
      </div>
    </GameShell>
  )
}
