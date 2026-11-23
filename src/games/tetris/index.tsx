import { Minus, Plus, Volume2, VolumeX } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Leaderboard } from "@/components/Leaderboard"
import { Button } from "@/components/ui/button"
import { Device } from "@/games/tetris/Device"
import type { Status } from "@/games/tetris/logic"
import { Screen } from "@/games/tetris/Screen"
import type { StartLevel } from "@/games/tetris/storage"
import { useTetrisGame } from "@/games/tetris/useTetrisGame"

function primaryLabel(status: Status) {
  switch (status) {
    case "ready":
      return "Start"
    case "playing":
      return "Pause"
    case "paused":
      return "Resume"
    case "over":
      return "New game"
  }
}

function statusText(status: Status, score: number, isNewBest: boolean) {
  switch (status) {
    case "ready":
      return "Arrows move, Up rotates, Down soft drops. Press Space or Start."
    case "playing":
      return "Press Space or Start to pause. Select hides the next piece."
    case "paused":
      return "Paused. Press Space or Start to resume."
    case "over":
      return `Game over · ${score} points${isNewBest ? " · New best!" : ""}.`
  }
}

export default function Tetris() {
  const {
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
    run,
  } = useTetrisGame()
  const best = bestScores[settings.startLevel]

  return (
    <GameShell
      toolbar={
        <>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Lower"
            disabled={settings.startLevel === 0}
            onClick={() => {
              if (settings.startLevel > 0) setStartLevel((settings.startLevel - 1) as StartLevel)
            }}
          >
            <Minus aria-hidden />
          </Button>
          <span>Level {settings.startLevel}</span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Higher"
            disabled={settings.startLevel === 9}
            onClick={() => {
              if (settings.startLevel < 9) setStartLevel((settings.startLevel + 1) as StartLevel)
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
          screen={<Screen game={game} preview={settings.preview} />}
          primaryLabel={primaryLabel(game.status)}
          previewOn={settings.preview}
          onHoldStart={holdStart}
          onHoldEnd={holdEnd}
          onRotate={rotate}
          onPrimary={primary}
          onPreview={togglePreview}
          onScreenTap={onScreenTap}
          onDrag={onDrag}
        />
        <p className="text-sm font-medium" aria-live="polite">
          {statusText(game.status, game.score, newBest)}
        </p>
        <Leaderboard game="tetris" run={run} />
      </div>
    </GameShell>
  )
}
