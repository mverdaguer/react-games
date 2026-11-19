import { bitmapRects, glyphRows, textWidth } from "@/games/shared/pixel-font"
import { COLUMNS, ROWS, pieceCells, type Game, type PieceKind } from "./logic"

const VIEW_WIDTH = 160
const VIEW_HEIGHT = 144
const CELL = 7
const WELL_X = 4
const WELL_Y = 2
const WELL_W = COLUMNS * CELL
const WELL_H = ROWS * CELL
const FONT_HEIGHT = 5
const LINE_GAP = 1
const PAD = 3

const PIECE_FILL = {
  I: "fill-tetris-i",
  O: "fill-tetris-o",
  T: "fill-tetris-t",
  S: "fill-tetris-s",
  Z: "fill-tetris-z",
  J: "fill-tetris-j",
  L: "fill-tetris-l",
} as const satisfies Record<PieceKind, string>

const WELL_GRID = wellGrid()

function wellGrid() {
  const lines = []
  for (let column = 0; column <= COLUMNS; column += 1) {
    const x = column === COLUMNS ? WELL_X + WELL_W - 1 : WELL_X + column * CELL
    lines.push(
      <rect
        key={`v${column}`}
        x={x}
        y={WELL_Y}
        width={1}
        height={WELL_H}
        className="fill-gbc-bezel opacity-15"
      />,
    )
  }
  for (let row = 0; row <= ROWS; row += 1) {
    const y = row === ROWS ? WELL_Y + WELL_H - 1 : WELL_Y + row * CELL
    lines.push(
      <rect
        key={`h${row}`}
        x={WELL_X}
        y={y}
        width={WELL_W}
        height={1}
        className="fill-gbc-bezel opacity-15"
      />,
    )
  }
  return lines
}

function Block({ x, y, kind }: { x: number; y: number; kind: PieceKind }) {
  return (
    <g>
      <rect x={x} y={y} width={CELL} height={CELL} className={PIECE_FILL[kind]} />
      <rect x={x} y={y} width={CELL} height={1} className="fill-white opacity-45" />
      <rect x={x} y={y} width={1} height={CELL} className="fill-white opacity-45" />
      <rect x={x} y={y + CELL - 1} width={CELL} height={1} className="fill-black opacity-35" />
      <rect x={x + CELL - 1} y={y} width={1} height={CELL} className="fill-black opacity-35" />
    </g>
  )
}

function PixelText({ text, x, y }: { text: string; x: number; y: number }) {
  return [...text].map((char, index) => (
    <g key={`${index}${char}`}>
      {bitmapRects(glyphRows(char)).map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={x + index * 4 + rect.x}
          y={y + rect.y}
          width={rect.w}
          height={1}
          className="fill-gbc-bezel"
        />
      ))}
    </g>
  ))
}

function padSpaces(value: number, length: number): string {
  return String(value).padStart(length, " ")
}

function messageLines(status: Game["status"]): readonly string[] {
  switch (status) {
    case "ready":
      return ["PRESS", "START"]
    case "paused":
      return ["PAUSE"]
    case "over":
      return ["GAME", "OVER"]
    case "playing":
      return []
  }
}

function MessagePlate({ lines }: { lines: readonly string[] }) {
  let contentWidth = 0
  let contentHeight = 0
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue
    const width = textWidth(line)
    if (width > contentWidth) contentWidth = width
    contentHeight += FONT_HEIGHT
    if (index < lines.length - 1) contentHeight += LINE_GAP
  }

  const boxWidth = contentWidth + PAD * 2
  const boxHeight = contentHeight + PAD * 2
  const boxX = WELL_X + Math.floor((WELL_W - boxWidth) / 2)
  const boxY = WELL_Y + Math.floor((WELL_H - boxHeight) / 2)

  const placed: { line: string; x: number; y: number }[] = []
  let cursorY = boxY + PAD
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue
    const width = textWidth(line)
    placed.push({
      line,
      x: boxX + Math.floor((boxWidth - width) / 2),
      y: cursorY,
    })
    cursorY += FONT_HEIGHT
    if (index < lines.length - 1) cursorY += LINE_GAP
  }

  return (
    <g>
      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} className="fill-gbc-bezel" />
      <rect
        x={boxX + 1}
        y={boxY + 1}
        width={boxWidth - 2}
        height={boxHeight - 2}
        className="fill-gbc-screen"
      />
      {placed.map((item) => (
        <PixelText key={item.line} text={item.line} x={item.x} y={item.y} />
      ))}
    </g>
  )
}

function StackedBlocks({ game }: { game: Game }) {
  const blocks = []
  for (let y = 0; y < game.board.length; y += 1) {
    const row = game.board[y]
    if (!row) continue
    for (let x = 0; x < row.length; x += 1) {
      const kind = row[x]
      if (!kind) continue
      blocks.push(<Block key={`${x}-${y}`} kind={kind} x={WELL_X + x * CELL} y={WELL_Y + y * CELL} />)
    }
  }
  for (const cell of pieceCells(game.active)) {
    if (cell.y < 0 || cell.y >= ROWS) continue
    blocks.push(
      <Block
        key={`live-${cell.x}-${cell.y}`}
        kind={game.active.kind}
        x={WELL_X + cell.x * CELL}
        y={WELL_Y + cell.y * CELL}
      />,
    )
  }
  return <g className={game.status === "over" ? "animate-lcd-blink" : undefined}>{blocks}</g>
}

function NextPiece({ kind }: { kind: PieceKind }) {
  const cells = pieceCells({ kind, rotation: 0, x: 0, y: 0 })
  let minX = cells[0]?.x ?? 0
  let minY = cells[0]?.y ?? 0
  for (const cell of cells) {
    if (cell.x < minX) minX = cell.x
    if (cell.y < minY) minY = cell.y
  }
  return cells.map((cell) => (
    <Block
      key={`${cell.x}-${cell.y}`}
      kind={kind}
      x={100 + (cell.x - minX) * CELL}
      y={92 + (cell.y - minY) * CELL}
    />
  ))
}

export function Screen({ game, preview }: { game: Game; preview: boolean }) {
  const lines = messageLines(game.status)

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      shapeRendering="crispEdges"
      className="block h-auto w-full"
      aria-label={`Tetris board, score ${game.score}, level ${game.level}, lines ${game.lines}, next ${preview ? game.next : "hidden"}, piece ${game.active.kind} at ${game.active.x},${game.active.y} rotation ${game.active.rotation}`}
    >
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-gbc-screen" />
      {WELL_GRID}
      <StackedBlocks game={game} />
      <PixelText text="SCORE" x={82} y={6} />
      <PixelText text={padSpaces(game.score, 6)} x={82} y={14} />
      <PixelText text="LEVEL" x={82} y={30} />
      <PixelText text={String(game.level)} x={82} y={38} />
      <PixelText text="LINES" x={82} y={54} />
      <PixelText text={padSpaces(game.lines, 3)} x={82} y={62} />
      <PixelText text="NEXT" x={82} y={80} />
      {preview ? <NextPiece kind={game.next} /> : null}
      {lines.length > 0 ? <MessagePlate lines={lines} /> : null}
    </svg>
  )
}
