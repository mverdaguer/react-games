# Improvement plan

A working reference for the showcase improvements. Item numbers match the original review, so some numbers are skipped. Everything here is free.

An item is finished when these four pass with no warnings:

```bash
pnpm lint && pnpm build && pnpm test && pnpm test:e2e
```

## Suggested order

| Step | Item | Size | Why here |
| --- | --- | --- | --- |
| 1 | [Leaderboard](#leaderboard) | Large | Snake's `logic.ts` already imports [`shared/random.ts`](../src/games/shared/random.ts), so the Worker can replay through that module. |
| 2 | [4. README clip](#4-readme-clip) | Small | Last, so the clip shows the final UI. |

After the last UI change, run `pnpm screenshots` once so the README images and `public/og.png` stay current.

---

## 2. Author

Done. The README, [`index.html`](../index.html), and [`package.json`](../package.json) name Marc Verdaguer. The sidebar footer keeps its existing link to the GitHub repo.

- [`index.html`](../index.html) has `<meta name="author" content="Marc Verdaguer" />`.
- The README ends with an Author section: one line on the work, and a link to the GitHub profile.
- [`package.json`](../package.json) has `"author": "Marc Verdaguer"`. The app version is `0.2.0`, and the sidebar footer reads it from that field.

**Done when**

- [x] `index.html`, the README, and `package.json` name the author. The sidebar keeps its existing GitHub link.

---

## 3. Tic-Tac-Toe against the computer

Done. The game opens against the computer on Easy. The toolbar also offers Hard, which never loses, and Two players. The person plays X and moves first.

- [`logic.ts`](../src/games/tic-tac-toe/logic.ts) exports `bestMove` and `computerMove`. Hard is a minimax search that prefers a fast win and a slow loss. Easy plays a random empty cell half the time, through a `random` parameter. The logic tests cover a win taken over a block, a block, and every opponent sequence: 569 games moving second and 73 moving first, with no losses.
- The reply is a 400 ms timeout started from the click handler and kept in a ref. New round, a mode change, and unmount clear it. The cells are disabled while the computer is about to move, and the status line says "Computer to move". Changing mode resets the score.
- [`registry.ts`](../src/games/registry.ts) tags the game `["Solo", "Two player"]`. The README games table matches.

**Done when**

- [x] The component test covers one full game against the computer.
- [x] "New round" during the 400 ms wait does not leave an O on the fresh board.

---

## 4. README clip

**Problem.** Screenshots cannot show the View Transitions, which the README lists as a highlight.

Playwright records video for free. Use a separate config so it never runs with the tests:

1. Add `playwright.recording.config.ts`, modelled on [`playwright.screenshots.config.ts`](../playwright.screenshots.config.ts), with these differences:

   ```ts
   testDir: "./scripts/recording",
   outputDir: "test-results/recording",
   use: {
     baseURL: "http://localhost:4173",
     viewport: { width: 1280, height: 720 },
     colorScheme: "dark",
     video: { mode: "on", size: { width: 1280, height: 720 } },
   },
   ```

   **Leave out `reducedMotion: "reduce"`.** [`src/index.css`](../src/index.css) sets every view-transition animation to zero seconds under reduced motion, so the clip would show no transitions. For the same reason, do not reuse the `prepare()` helper from the screenshot spec as it is; it also emulates reduced motion.
2. Add the new config file to the `include` list in [`tsconfig.node.json`](../tsconfig.node.json). That list names each config file, so a new one is not typechecked until you add it.
3. Write `scripts/recording/tour.spec.ts`: open the shelf, click the Tetris card, start and move a few pieces, switch to Pang from the sidebar, go back to the shelf. Use `page.waitForTimeout` between steps to pace it. That is wrong in a test and right in a recording.
4. Add a script: `"record": "playwright test -c playwright.recording.config.ts"`.
5. The video is written as `.webm` under `test-results/recording/`, which is gitignored. Convert it to a GIF, which GitHub plays inline:

   ```bash
   ffmpeg -i video.webm -vf "fps=15,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" docs/screenshots/tour.gif
   ```

   `ffmpeg` is free (`brew install ffmpeg`). Aim for 8 to 10 seconds and under about 3 MB.

Two things I have not tested: whether headless Chromium captures the transitions in the video, and how sharp Playwright's video is at this size. If the first recording shows hard cuts, run it headed with `--headed`.

An alternative that keeps the binary out of the repo: edit the README on github.com and drag an `.mp4` into the editor. GitHub hosts it and renders a player.

**Done when**

- [ ] The clip sits near the top of the README and shows a forward, a lateral, and a back transition.

---

## 5. Shared storage, sound, and random

Done. The copies now live in `src/games/shared/`. Each game keeps its previous exports and storage keys, so a score saved before the change still loads.

- [`sound.ts`](../src/games/shared/sound.ts) exports `createSoundPlayer`. Snake, Tetris, and Pang pass in their tone tables and share one `AudioContext`. The sound kind is inferred from the table keys.
- [`storage.ts`](../src/games/shared/storage.ts) exports `readRecord`, `writeRecord`, and `createBestStore`. Snake and Tetris keep a higher score. Minesweeper keeps a lower time. Pang still validates its own `{ score, level }` record on top of `readRecord` and `writeRecord`, and each game keeps its own settings checks. `readRecord` returns null for arrays as well as for corrupt JSON and other non-objects. [`storage.test.ts`](../src/games/shared/storage.test.ts) covers those cases, including a `setItem` that throws.
- [`random.ts`](../src/games/shared/random.ts) exports `random` and `randomInt`. Snake and Tetris re-export them from `logic.ts`. Pang imports them. The screenshot spec keeps its own copy, because Playwright serializes that function into the page.

**Done when**

- [x] The existing test files pass unedited.
- [x] `shared/storage.ts` has its own test, including corrupt JSON and a `setItem` that throws.
- [x] A best score saved before the refactor still shows after it.

---

## 7. Error boundary

Done. A failed game chunk shows a reload prompt instead of unmounting the app. This covers a tab left open across a deploy, when the old hashed file no longer exists on the server.

- [`GameErrorBoundary`](../src/components/GameErrorBoundary.tsx) wraps the `Suspense` in [`GamePage`](../src/pages/GamePage.tsx), keyed by `game.slug`. React Router reuses `GamePage` for every slug, so the key clears a previous failure when the visitor picks another game. The button reloads the page. `lazy()` remembers a failed import, so rendering the same component again would fail again. The boundary adds no DOM element, so the `ViewTransition` inside it still animates.
- [`page-transition.tsx`](../src/components/page-transition.tsx) catches a rejected preload on hover and focus. The boundary reports the failure if the visitor then clicks.
- [`GameErrorBoundary.test.tsx`](../src/components/GameErrorBoundary.test.tsx) renders a child that throws and finds the alert and the Reload button.
- The navigation e2e test blocks `**/assets/tetris-*.js`, expects the alert, then opens Snake from the sidebar.

**Done when**

- [x] A component test renders a child that throws and finds the alert and the Reload button.
- [x] An e2e test blocks the chunk and loads the page.
- [x] After that failure, choosing another game from the sidebar loads it.

---

## 9. Accessibility checks

Done. `@axe-core/playwright` runs the axe rule set inside the existing e2e run. [`e2e/accessibility.spec.ts`](../e2e/accessibility.spec.ts) scans eight routes in the light and dark themes, plus a finished two-player Tic-Tac-Toe round in each theme. The theme follows `colorScheme`, and reduced motion is on so a view transition cannot be mid-fade when axe measures contrast.

The first run failed, and each failure was a real problem:

- The active sidebar row tints its background, and "Pick a game" was `text-muted-foreground` (3.95:1). It now uses `text-sidebar-accent-foreground`.
- In the dark theme one violet had to be a button fill and a text color. The fill is now `--primary` at `oklch(0.54 0.22 292.7)`, which clears 4.5:1 with the light label. Text and icons use `--primary-ink` at `oklch(0.78 0.12 293)`. In the light theme the ink follows `--primary`, which already passed.
- The Minesweeper mine and time readouts put `aria-label` on a `div`. They are `role="img"`, so the label is allowed and the LED digits stay hidden from the name.
- The Snake keypad names ("Up") left out the printed digit. The Tetris A, B, SELECT, and START names left out the printed words. Each accessible name now includes that text, so a speech-control user can say what is on the key. The component tests look the buttons up by those names.
- "GAME BOY COLOR" used the light button ink on the purple shell (2.85:1). It now uses the bezel color, which clears 4.5:1.

Nothing is excluded. Axe still only checks what a machine can detect. The README says it does not check that a game is playable by keyboard.

**Done when**

- [x] All eighteen tests pass. Nothing is excluded.

---

## Leaderboard

Done. Snake, Tetris, and Pang share one top-ten board each on Cloudflare D1. The browser sends the seed and the input log. The Worker replays that log with the same `logic.ts` and stores the score the replay produces, and only when it beats the current tenth. A tie keeps the older row. Long games are replayed a few thousand steps at a time, because the free plan allows about 10 ms of CPU per request.

- [`leaderboard.ts`](../src/games/shared/leaderboard.ts) holds the games, the log rules, and the name rule: exactly 3 letters, stored in capitals.
- [`name-filter.ts`](../src/games/shared/name-filter.ts) blocks rude names in English, Spanish, and Catalan. It folds case and accents, swaps digits back to letters, and collapses stretched letters. The form, `POST /api/runs`, and `GET /api/scores` all use it, so a word added later also drops older rows.
- Each game has a `replay.ts` with `begin` and `advance`. Node tests record a game with the real rules and replay it whole and one step at a time. Pang's test also round-trips a checkpoint through JSON.
- [`useTetrisGame.ts`](../src/games/tetris/useTetrisGame.ts) still reads `tetris:gravity-ms` for the tests and the screenshots. A game played with that key is not submitted.
- The panel says the leaderboard is unavailable when `/api/scores` is not JSON, which is what `pnpm preview` returns. The local best score stays.
- [`wrangler.jsonc`](../wrangler.jsonc) runs the Worker only for `/api/*`. Replace `database_id` after `pnpm wrangler d1 create arcade`. The deploy job applies migrations first. The API token needs D1 edit permission.

**Done when**

- [x] A recorded game replays to the same score in a Node test.
- [x] A request with a tampered turn list is rejected or stored with the lower score it really produces.
- [x] A name that is not exactly 3 letters, or that the word list blocks, is rejected by the Worker.
- [x] With the API unreachable, Snake still plays and the panel says the leaderboard is unavailable.
- [x] The README says how scores are validated, what that does not prove, and how to delete a row.
