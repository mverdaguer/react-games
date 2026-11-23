import { useEffect, useState, useTransition, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  checkName,
  levelLabel,
  MAX_NAME_LENGTH,
  qualifies,
  type GameId,
  type RecordedRun,
} from "@/games/shared/leaderboard"
import { fetchScores, submitRun, type ScoreRow } from "@/lib/leaderboard-client"

type Board =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; scores: ScoreRow[] }

const FORMAT_HINT = "Use 3 letters."

export function Leaderboard({ game, run }: { game: GameId; run: RecordedRun | null }) {
  const [board, setBoard] = useState<Board>({ status: "loading" })
  const [notice, setNotice] = useState<{ key: string; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const runKey = run ? `${run.seed}:${run.score}:${run.log.length}` : ""
  const shown = notice?.key === runKey ? notice.text : null

  useEffect(() => {
    let ignore = false
    void fetchScores(game).then((loaded) => {
      if (ignore) return
      setBoard(loaded.status === "ok" ? { status: "ready", scores: loaded.scores } : { status: "unavailable" })
    })
    return () => {
      ignore = true
    }
  }, [game])

  const places = Boolean(run?.ranked && board.status === "ready" && qualifies(run.score, board.scores))

  function submit(name: string) {
    if (!run) return
    startTransition(async () => {
      const submitted = await submitRun(run, name)
      if (submitted.status === "saved") {
        setNotice({ key: runKey, text: `Saved. You are rank ${submitted.rank}.` })
        const loaded = await fetchScores(game)
        if (loaded.status === "ok") setBoard({ status: "ready", scores: loaded.scores })
        return
      }
      if (submitted.status === "not-placed") {
        setNotice({ key: runKey, text: "That score didn't make the top ten." })
        return
      }
      if (submitted.status === "rejected") {
        setNotice({ key: runKey, text: "That score couldn't be verified." })
        return
      }
      setBoard({ status: "unavailable" })
    })
  }

  return (
    <section className="flex w-full max-w-sm flex-col gap-3" aria-labelledby="top-scores-heading">
      <h2 id="top-scores-heading" className="font-heading text-base font-medium">
        Top scores
      </h2>
      <ScoreList board={board} game={game} />
      {run && !run.ranked ? (
        <p className="text-sm">Scores from a custom fall speed are not submitted.</p>
      ) : null}
      {places && run && !shown ? <NameForm key={runKey} pending={pending} onSubmit={submit} /> : null}
      {shown ? <p className="text-sm">{shown}</p> : null}
    </section>
  )
}

function NameForm({ pending, onSubmit }: { pending: boolean; onSubmit: (name: string) => void }) {
  const [draft, setDraft] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  function onSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = checkName(draft)
    if (!name.ok) {
      setNameError(name.reason === "rude" ? "That name isn't allowed. Try another." : FORMAT_HINT)
      return
    }
    setNameError(null)
    onSubmit(name.name)
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmitForm}>
      <label htmlFor="score-name" className="text-sm font-medium">
        Initials
      </label>
      <Input
        id="score-name"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={nameError !== null}
        aria-describedby="score-name-hint"
        className="w-16 font-mono tracking-widest"
        onChange={(event) => setDraft(event.target.value.toLocaleUpperCase())}
      />
      <p id="score-name-hint" className="text-xs text-muted-foreground">
        {FORMAT_HINT}
      </p>
      {nameError ? (
        <p role="alert" className="text-sm text-destructive">
          {nameError}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking score…" : "Submit"}
      </Button>
    </form>
  )
}

function ScoreList({ board, game }: { board: Board; game: GameId }) {
  if (board.status === "loading") return <p className="text-sm text-muted-foreground">Loading scores…</p>
  if (board.status === "unavailable") return <p className="text-sm">Leaderboard unavailable</p>
  if (board.scores.length === 0) return <p className="text-sm text-muted-foreground">No scores yet.</p>
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {board.scores.map((row, index) => (
        <li key={row.id} className="flex items-baseline justify-between gap-3">
          <span>
            {index + 1}. {row.name}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {row.score} · {levelLabel(game, row.level)}
          </span>
        </li>
      ))}
    </ol>
  )
}
