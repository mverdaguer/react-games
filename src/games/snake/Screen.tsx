import { memo, useId } from "react"
import {
  appleAhead,
  crossesEdge,
  neighborDirection,
  type Direction,
  type Game,
  type Point,
} from "./logic"
import { bitmapRects, glyphRows, textWidth } from "./pixel-font"
import { apple, body, critters, head, meal, tail } from "./sprites"

const VIEW_WIDTH = 99
const VIEW_HEIGHT = 62
const CELL = 4
const ORIGIN_X = 2
const ORIGIN_Y = 9
const FONT_HEIGHT = 5
const PAD = 3
const LINE_GAP = 1

const FRAME_DOTS = frameDots()

function frameDots(): Point[] {
  const dots: Point[] = []
  for (let x = 0; x <= 98; x += 1) {
    if ((x + 7) % 2 === 0) dots.push({ x, y: 7 })
    if ((x + 61) % 2 === 0) dots.push({ x, y: 61 })
  }
  for (let y = 8; y <= 60; y += 1) {
    if ((0 + y) % 2 === 0) dots.push({ x: 0, y })
    if ((98 + y) % 2 === 0) dots.push({ x: 98, y })
  }
  return dots
}

function usePatternId(prefix: string): string {
  return `${prefix}${useId().replaceAll(":", "")}`
}

function cellOrigin(point: Point): Point {
  return { x: ORIGIN_X + point.x * CELL, y: ORIGIN_Y + point.y * CELL }
}

function digits(value: number, length: number): string {
  return String(value).padStart(length, "0").slice(-length)
}

const DOT = 0.82
const DOT_INSET = (1 - DOT) / 2

function Bitmap({
  bitmap,
  x,
  y,
  scale = 1,
}: {
  bitmap: readonly string[]
  x: number
  y: number
  scale?: number
}) {
  return bitmapRects(bitmap).flatMap((rect) =>
    Array.from({ length: rect.w }, (_, index) => (
      <rect
        key={`${rect.x + index}-${rect.y}`}
        x={x + (rect.x + index) * scale + DOT_INSET * scale}
        y={y + rect.y * scale + DOT_INSET * scale}
        width={DOT * scale}
        height={DOT * scale}
        className="fill-lcd-ink"
      />
    )),
  )
}

function PixelText({
  text,
  x,
  y,
  scale = 1,
}: {
  text: string
  x: number
  y: number
  scale?: number
}) {
  return [...text].map((char, index) => (
    <Bitmap
      key={`${char}-${index}`}
      bitmap={glyphRows(char)}
      x={x + index * 4 * scale}
      y={y}
      scale={scale}
    />
  ))
}

const DottedFrame = memo(function DottedFrame() {
  return FRAME_DOTS.map((dot) => (
    <rect
      key={`${dot.x}-${dot.y}`}
      x={dot.x + DOT_INSET}
      y={dot.y + DOT_INSET}
      width={DOT}
      height={DOT}
      className="fill-lcd-ink"
    />
  ))
})

const LcdBackdrop = memo(function LcdBackdrop() {
  const id = usePatternId("ghost")
  return (
    <>
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-lcd" />
      <pattern id={id} width={1} height={1} patternUnits="userSpaceOnUse">
        <rect width={0.8} height={0.8} className="fill-lcd-ghost" />
      </pattern>
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${id})`} />
      <DottedFrame />
    </>
  )
})

function Connector({
  from,
  to,
  columns,
  rows,
}: {
  from: Point
  to: Point
  columns: number
  rows: number
}) {
  const direction = neighborDirection(from, to, columns, rows)
  if (direction === null || crossesEdge(from, to)) return null
  const ox = ORIGIN_X + from.x * CELL
  const oy = ORIGIN_Y + from.y * CELL
  const rect = connectorRect(direction, ox, oy)
  return (
    <rect
      x={rect.x + DOT_INSET}
      y={rect.y + DOT_INSET}
      width={DOT}
      height={DOT}
      className="fill-lcd-ink"
    />
  )
}

function connectorRect(direction: Direction, ox: number, oy: number): Point {
  switch (direction) {
    case "right":
      return { x: ox + 3, y: oy + 1 }
    case "left":
      return { x: ox - 1, y: oy + 1 }
    case "down":
      return { x: ox + 1, y: oy + 3 }
    case "up":
      return { x: ox + 1, y: oy - 1 }
  }
}

function segmentBitmap(
  game: Game,
  index: number,
  heading: Direction,
  mouth: "open" | "closed",
): readonly string[] {
  if (index === 0) return head[mouth][heading]
  const segment = game.snake[index]
  const previous = game.snake[index - 1]
  const isTail = game.snake.length > 1 && index === game.snake.length - 1
  if (isTail && segment && previous) {
    const direction = neighborDirection(segment, previous, game.columns, game.rows)
    if (direction) return tail[direction]
    return body
  }
  if (game.meals.includes(index)) return meal
  return body
}

function BonusReadout({ kind, ticksLeft }: { kind: number; ticksLeft: number }) {
  const label = digits(ticksLeft, 2)
  const labelX = VIEW_WIDTH - textWidth(label)
  const critter = critters[kind % critters.length] ?? critters[0]
  if (!critter) return <PixelText text={label} x={labelX} y={1} />
  return (
    <>
      <Bitmap bitmap={critter} x={labelX - 1 - 7} y={2} />
      <PixelText text={label} x={labelX} y={1} />
    </>
  )
}

type MessageLine = { text: string; scale: number }

function messageLines(game: Game): readonly MessageLine[] {
  const score = `SCORE ${digits(game.score, 4)}`
  switch (game.status) {
    case "ready":
      return [
        { text: "SNAKE", scale: 2 },
        { text: `LEVEL ${game.level}`, scale: 1 },
      ]
    case "paused":
      return [{ text: "PAUSED", scale: 1 }]
    case "over":
      return [
        { text: "GAME OVER", scale: 1 },
        { text: score, scale: 1 },
      ]
    case "won":
      return [
        { text: "YOU WIN", scale: 1 },
        { text: score, scale: 1 },
      ]
    case "playing":
      return []
  }
}

function MessageBox({ game }: { game: Game }) {
  const lines = messageLines(game)
  if (lines.length === 0) return null

  let contentWidth = 0
  let contentHeight = 0
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line) continue
    const width = textWidth(line.text) * line.scale
    if (width > contentWidth) contentWidth = width
    contentHeight += FONT_HEIGHT * line.scale
    if (index < lines.length - 1) contentHeight += LINE_GAP
  }

  const boxWidth = contentWidth + PAD * 2
  const boxHeight = contentHeight + PAD * 2
  const boxX = Math.floor((VIEW_WIDTH - boxWidth) / 2)
  const boxY = Math.floor((VIEW_HEIGHT - boxHeight) / 2)

  const placed: { line: MessageLine; x: number; y: number }[] = []
  let cursorY = boxY + PAD
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line) continue
    const width = textWidth(line.text) * line.scale
    placed.push({
      line,
      x: boxX + Math.floor((boxWidth - width) / 2),
      y: cursorY,
    })
    cursorY += FONT_HEIGHT * line.scale
    if (index < lines.length - 1) cursorY += LINE_GAP
  }

  return (
    <g>
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        className="fill-lcd-ink"
      />
      <rect
        x={boxX + 1}
        y={boxY + 1}
        width={boxWidth - 2}
        height={boxHeight - 2}
        className="fill-lcd"
      />
      {placed.map((item) => (
        <PixelText
          key={item.line.text}
          text={item.line.text}
          x={item.x}
          y={item.y}
          scale={item.line.scale}
        />
      ))}
    </g>
  )
}

export function Screen({ game }: { game: Game }) {
  const heading = game.pending[0] ?? game.direction
  const mouth = appleAhead(game) ? "open" : "closed"
  const appleCell = game.apple
  const bonus = game.bonus
  const vacated = game.vacated
  const bonusSprite = bonus ? critters[bonus.kind % critters.length] : undefined

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={`Snake board, score ${game.score}, heading ${heading}, length ${game.snake.length}`}
      className="block h-auto w-full"
      shapeRendering="crispEdges"
    >
      <LcdBackdrop />
      <PixelText text={digits(game.score, 4)} x={1} y={1} />
      {bonus ? <BonusReadout kind={bonus.kind} ticksLeft={bonus.ticksLeft} /> : null}
      {appleCell ? (
        <Bitmap bitmap={apple} x={cellOrigin(appleCell).x} y={cellOrigin(appleCell).y} />
      ) : null}
      {bonus && bonusSprite ? (
        <Bitmap bitmap={bonusSprite} x={cellOrigin(bonus.at).x} y={cellOrigin(bonus.at).y} />
      ) : null}
      {vacated ? (
        <g opacity="0.3">
          <Bitmap bitmap={body} x={cellOrigin(vacated).x} y={cellOrigin(vacated).y} />
        </g>
      ) : null}
      <g className={game.status === "over" ? "animate-lcd-blink" : undefined}>
        {game.snake.map((segment, index) => {
          const origin = cellOrigin(segment)
          const previous = game.snake[index - 1]
          return (
            <g key={index}>
              <Bitmap
                bitmap={segmentBitmap(game, index, heading, mouth)}
                x={origin.x}
                y={origin.y}
              />
              {index > 0 && previous ? (
                <Connector
                  from={segment}
                  to={previous}
                  columns={game.columns}
                  rows={game.rows}
                />
              ) : null}
            </g>
          )
        })}
      </g>
      {game.status !== "playing" ? <MessageBox game={game} /> : null}
    </svg>
  )
}
