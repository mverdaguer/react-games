import { bitmapRects, glyphRows, textWidth } from "@/games/shared/pixel-font"
import {
  BALL_R,
  BRICK_H,
  BRICK_W,
  FIELD_RIGHT,
  FIELD_TOP,
  FIELD_X,
  GATE_X,
  PADDLE_H,
  PADDLE_W,
  PADDLE_WIDE,
  PADDLE_Y,
  SUB,
  type Brick,
  type Capsule,
  type CapsuleKind,
  type ColorId,
  type Game,
} from "./logic"

const VIEW_WIDTH = 160
const VIEW_HEIGHT = 144
const FONT_HEIGHT = 5
const LINE_GAP = 1
const PAD = 3
const HUD_X = 112
const WALL_TOP = 4
const GATE_GAP = 16
const CAPSULE_W = 8
const CAPSULE_H = 4
const LASER_W = 1
const LASER_H = 6
const PLAY_X = FIELD_X
const PLAY_Y = WALL_TOP
const PLAY_W = FIELD_RIGHT - FIELD_X
const PLAY_H = PADDLE_Y + PADDLE_H - PLAY_Y

const COLOR_FILL = {
  0: "fill-arkanoid-brick-0",
  1: "fill-arkanoid-brick-1",
  2: "fill-arkanoid-brick-2",
  3: "fill-arkanoid-brick-3",
  4: "fill-arkanoid-brick-4",
  5: "fill-arkanoid-brick-5",
} as const satisfies Record<ColorId, string>

const CAPSULE_LETTER = {
  slow: "S",
  catch: "C",
  expand: "E",
  disruption: "D",
  laser: "L",
  break: "B",
  player: "P",
} as const satisfies Record<CapsuleKind, string>

function brickFill(brick: Brick): string {
  if (brick.kind === "silver") return "fill-arkanoid-silver"
  if (brick.kind === "gold") return "fill-arkanoid-gold"
  return COLOR_FILL[brick.color]
}

function Bevel({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={1} className="fill-white opacity-45" />
      <rect x={x} y={y} width={1} height={height} className="fill-white opacity-45" />
      <rect x={x} y={y + height - 1} width={width} height={1} className="fill-black opacity-35" />
      <rect x={x + width - 1} y={y} width={1} height={height} className="fill-black opacity-35" />
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

function messageLines(game: Game): readonly string[] {
  switch (game.status) {
    case "ready":
      return ["PRESS", "START"]
    case "paused":
      return ["PAUSE"]
    case "cleared":
      return ["ROUND", String(game.level)]
    case "over":
      return ["GAME", "OVER"]
    case "playing":
    case "dying":
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
  const boxX = PLAY_X + Math.floor((PLAY_W - boxWidth) / 2)
  const boxY = PLAY_Y + Math.floor((PLAY_H - boxHeight) / 2)

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

function Walls({ gate }: { gate: boolean }) {
  const span = PADDLE_Y - WALL_TOP
  const rightHeight = gate ? span - GATE_GAP : span
  return (
    <g>
      <rect
        x={FIELD_X - 1}
        y={WALL_TOP}
        width={FIELD_RIGHT - FIELD_X + 2}
        height={1}
        className="fill-gbc-bezel"
      />
      <rect x={FIELD_X - 1} y={WALL_TOP} width={1} height={span} className="fill-gbc-bezel" />
      <rect x={FIELD_RIGHT} y={WALL_TOP} width={1} height={rightHeight} className="fill-gbc-bezel" />
      {gate ? (
        <rect
          x={GATE_X}
          y={WALL_TOP + rightHeight}
          width={2}
          height={GATE_GAP}
          className="fill-arkanoid-gate"
        />
      ) : null}
    </g>
  )
}

function BrickTile({ brick }: { brick: Brick }) {
  const x = FIELD_X + brick.col * BRICK_W
  const y = FIELD_TOP + brick.row * BRICK_H
  return (
    <g>
      <rect x={x} y={y} width={BRICK_W} height={BRICK_H} className={brickFill(brick)} />
      <Bevel x={x} y={y} width={BRICK_W} height={BRICK_H} />
    </g>
  )
}

function Paddle({ game }: { game: Game }) {
  const width = game.wide ? PADDLE_WIDE : PADDLE_W
  const x = Math.round(game.paddleX / SUB)
  return (
    <g>
      <rect x={x} y={PADDLE_Y} width={width} height={PADDLE_H} className="fill-arkanoid-vaus" />
      <Bevel x={x} y={PADDLE_Y} width={width} height={PADDLE_H} />
    </g>
  )
}

function BallTile({ ball }: { ball: Game["balls"][number] }) {
  const size = BALL_R * 2
  return (
    <rect
      x={Math.round(ball.x / SUB) - BALL_R}
      y={Math.round(ball.y / SUB) - BALL_R}
      width={size}
      height={size}
      className="fill-arkanoid-ball"
    />
  )
}

function CapsuleTile({ capsule }: { capsule: Capsule }) {
  const letter = CAPSULE_LETTER[capsule.kind]
  const originX = Math.round(capsule.x / SUB)
  const originY = Math.round(capsule.y / SUB)
  return (
    <g>
      <rect
        x={originX}
        y={originY}
        width={CAPSULE_W}
        height={CAPSULE_H}
        className="fill-arkanoid-capsule"
      />
      <PixelText
        text={letter}
        x={originX + Math.round((CAPSULE_W - textWidth(letter)) / 2)}
        y={originY + Math.round((CAPSULE_H - FONT_HEIGHT) / 2)}
      />
    </g>
  )
}

function Court({ game }: { game: Game }) {
  return (
    <g className={game.status === "over" ? "animate-lcd-blink" : undefined}>
      {game.bricks.map((brick) => (
        <BrickTile key={`${brick.col}-${brick.row}`} brick={brick} />
      ))}
      <Paddle game={game} />
      {game.balls.map((ball) => (
        <BallTile key={ball.id} ball={ball} />
      ))}
    </g>
  )
}

export function Screen({ game, best }: { game: Game; best: number | null }) {
  const lines = messageLines(game)
  const stuck = game.balls.some((ball) => ball.stuck) ? "yes" : "no"
  const high = best === null ? "  NONE" : padSpaces(best, 6)

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      shapeRendering="crispEdges"
      className="block h-auto w-full"
      aria-label={`Arkanoid board, score ${game.score}, round ${game.level}, lives ${game.lives}, balls ${game.balls.length}, stuck ${stuck}`}
    >
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-gbc-screen" />
      <Walls gate={game.gate} />
      <Court game={game} />
      {game.capsule ? <CapsuleTile capsule={game.capsule} /> : null}
      {game.lasers.map((laser, index) => (
        <rect
          key={`${index}-${laser.x}-${laser.y}`}
          x={Math.round(laser.x / SUB)}
          y={Math.round(laser.y / SUB)}
          width={LASER_W}
          height={LASER_H}
          className="fill-arkanoid-laser"
        />
      ))}
      <PixelText text="SCORE" x={HUD_X} y={6} />
      <PixelText text={padSpaces(game.score, 6)} x={HUD_X} y={14} />
      <PixelText text="HIGH" x={HUD_X} y={28} />
      <PixelText text={high} x={HUD_X} y={36} />
      <PixelText text="ROUND" x={HUD_X} y={50} />
      <PixelText text={padSpaces(game.level, 3)} x={HUD_X} y={58} />
      <PixelText text="UP" x={HUD_X} y={72} />
      <PixelText text={String(game.lives)} x={HUD_X} y={80} />
      {lines.length > 0 ? <MessagePlate lines={lines} /> : null}
    </svg>
  )
}
