import { useEffect, useState, useTransition, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  checkName,
  levelLabel,
  qualifies,
  type GameId,
  type RecordedRun,
} from "@/games/shared/leaderboard"
import { fetchScores, submitRun, type ScoreRow } from "@/lib/leaderboard-client"

type Board =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; scores: ScoreRow[] }

const NAME_LENGTH = 3
const FORMAT_HINT = "Use 3 letters."

export function Leaderboard({ game, run }: { game: GameId; run: RecordedRun | null }) {
  const [board, setBoard] = useState<Board>({ status: "loading" })
  const [notice, setNotice] = useState<{ key: string; text: string } | null>(null)
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const runKey = run ? `${run.seed}:${run.score}:${run.log.length}` : ""
  const shown = notice?.key === runKey ? notice.text : null
  const failed = failure?.key === runKey ? failure.text : null

  useEffect(() => {
    let ignore = false
    void fetchScores(game).then((loaded) => {
      if (ignore) return
      setBoard(loaded.status === "ok" ? { status: "ready", scores: loaded.scores } : { status: "unavailable" })
    })
    return () => {
      ignore = true
    }
  }, [game, reload])

  const places = Boolean(run && run.unranked === null && board.status === "ready" && qualifies(run.score, board.scores))
  const checking = pending && submittingKey === runKey
  const ask = Boolean(run && places && !shown)
  const dismissed = dismissedKey === runKey

  function retry() {
    setBoard({ status: "loading" })
    setReload((count) => count + 1)
  }

  function submit(name: string) {
    if (!run) return
    const key = runKey
    setFailure(null)
    setSubmittingKey(key)
    startTransition(async () => {
      try {
        const submitted = await submitRun(run, name)
        if (submitted.status === "saved") {
          setNotice({ key, text: `Saved at rank ${submitted.rank}.` })
          const loaded = await fetchScores(game)
          if (loaded.status === "ok") setBoard({ status: "ready", scores: loaded.scores })
          return
        }
        if (submitted.status === "not-placed") {
          setNotice({ key, text: "That score didn't make the top ten." })
          return
        }
        if (submitted.status === "rejected") {
          setNotice({ key, text: "That score couldn't be verified." })
          return
        }
        setFailure({ key, text: "The leaderboard could not be reached. Try again." })
      } finally {
        setSubmittingKey((current) => (current === key ? null : current))
      }
    })
  }

  return (
    <section className="flex w-full max-w-sm flex-col gap-3" aria-labelledby="top-scores-heading">
      <h2 id="top-scores-heading" className="font-heading text-base font-medium">
        Top scores
      </h2>
      <ScoreList board={board} game={game} />
      {board.status === "unavailable" ? (
        <Button type="button" variant="outline" onClick={retry}>
          Try again
        </Button>
      ) : null}
      {run?.unranked === "custom-speed" ? (
        <p className="text-sm">Scores from a custom fall speed are not submitted.</p>
      ) : null}
      {run?.unranked === "too-long" ? (
        <p className="text-sm">This game ran too long to verify, so it is not submitted.</p>
      ) : null}
      {ask && run && !dismissed ? (
        <Dialog
          open
          modal={!checking}
          onOpenChange={(next) => {
            if (!next && !checking) setDismissedKey(runKey)
          }}
        >
          <DialogContent overlayClassName={checking ? "pointer-events-none" : undefined}>
            <DialogHeader>
              <DialogTitle>Save your score</DialogTitle>
              <DialogDescription>{run.score} points.</DialogDescription>
            </DialogHeader>
            <NameForm
              key={runKey}
              pending={checking}
              failure={failed}
              onSubmit={submit}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {ask && dismissed ? (
        <Button type="button" variant="outline" onClick={() => setDismissedKey(null)}>
          Enter initials
        </Button>
      ) : null}
      {shown ? <p className="text-sm">{shown}</p> : null}
    </section>
  )
}

function NameForm({
  pending,
  failure,
  onSubmit,
}: {
  pending: boolean
  failure: string | null
  onSubmit: (name: string) => void
}) {
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
    <form className="flex flex-col gap-4" onSubmit={onSubmitForm}>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <label htmlFor="score-name" className="text-sm font-medium">
            Initials
          </label>
          <p id="score-name-hint" className="text-xs text-muted-foreground">
            {FORMAT_HINT}
          </p>
        </div>
        <Input
          id="score-name"
          value={draft}
          maxLength={NAME_LENGTH}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={nameError !== null}
          aria-describedby="score-name-hint"
          className="w-16 font-mono tracking-widest"
          onChange={(event) => {
            const next = [...event.target.value.toLocaleUpperCase()].slice(0, NAME_LENGTH).join("")
            setDraft(next)
            if (next.length < draft.length) setNameError(null)
          }}
        />
        {nameError ? (
          <p role="alert" className="text-sm text-destructive">
            {nameError}
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking score…" : "Submit"}
        </Button>
      </DialogFooter>
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
