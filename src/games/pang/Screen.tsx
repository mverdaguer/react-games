import { bitmapRects, glyphRows, textWidth } from "@/games/shared/pixel-font"

import {
  CEILING,
  DROP_BLINK,
  FLOOR,
  HEIGHT,
  PLAYER_H,
  PLAYER_W,
  RADIUS,
  WIDTH,
  themeIndex,
  type BallSize,
  type BoostKind,
  type Game,
  type Shot,
} from "./logic"

const FONT_HEIGHT = 5
const LINE_GAP = 2
const PAD = 3

const SKY = [
  "fill-pang-sky-0",
  "fill-pang-sky-1",
  "fill-pang-sky-2",
  "fill-pang-sky-3",
  "fill-pang-sky-4",
  "fill-pang-sky-5",
] as const

const HILL = [
  "fill-pang-hill-0",
  "fill-pang-hill-1",
  "fill-pang-hill-2",
  "fill-pang-hill-3",
  "fill-pang-hill-4",
  "fill-pang-hill-5",
] as const

const GROUND = [
  "fill-pang-ground-0",
  "fill-pang-ground-1",
  "fill-pang-ground-2",
  "fill-pang-ground-3",
  "fill-pang-ground-4",
  "fill-pang-ground-5",
] as const

const BOOST_FILL: Record<BoostKind, string> = {
  double: "fill-pang-boost-double",
  wire: "fill-pang-boost-wire",
  gun: "fill-pang-boost-gun",
  shield: "fill-pang-boost-shield",
  freeze: "fill-pang-boost-freeze",
  slow: "fill-pang-boost-slow",
  dynamite: "fill-pang-boost-dynamite",
  life: "fill-pang-boost-life",
}

const WEAPON_LABEL: Record<Game["weapon"], string> = {
  harpoon: "HARP",
  wire: "WIRE",
  gun: "GUN",
}

const PLAYER_ROWS = [
  "....####....",
  "...######...",
  "...##..##...",
  "....####....",
  "...######...",
  "..########..",
  "..###..###..",
  "..###..###..",
  "...##..##...",
  "...##..##...",
  "...##..##...",
  "..###..###..",
  "..###..###..",
  "..##....##..",
  "..##....##..",
  ".###....###.",
]

type Run = { x: number; y: number; w: number }
type Disc = { body: Run[]; light: Run[]; shade: Run[] }

function inside(radius: number, x: number, y: number) {
  const dx = x + 0.5 - radius
  const dy = y + 0.5 - radius
  return { dx, dy, hit: dx * dx + dy * dy <= radius * radius }
}

function disc(radius: number): Disc {
  const body: Run[] = []
  const light: Run[] = []
  const shade: Run[] = []
  const layers = { body, light, shade }
  const diameter = radius * 2
  for (let y = 0; y < diameter; y += 1) {
    let x = 0
    while (x < diameter) {
      const pixel = inside(radius, x, y)
      if (!pixel.hit) {
        x += 1
        continue
      }
      const layer =
        pixel.dx < -radius * 0.15 && pixel.dy < -radius * 0.1
          ? "light"
          : pixel.dx > radius * 0.28 || pixel.dy > radius * 0.35
            ? "shade"
            : "body"
      const start = x
      x += 1
      while (x < diameter) {
        const next = inside(radius, x, y)
        if (!next.hit) break
        const nextLayer =
          next.dx < -radius * 0.15 && next.dy < -radius * 0.1
            ? "light"
            : next.dx > radius * 0.28 || next.dy > radius * 0.35
              ? "shade"
              : "body"
        if (nextLayer !== layer) break
        x += 1
      }
      layers[layer].push({ x: start, y, w: x - start })
    }
  }
  return { body, light, shade }
}

const DISCS: Record<BallSize, Disc> = {
  0: disc(RADIUS[0]),
  1: disc(RADIUS[1]),
  2: disc(RADIUS[2]),
  3: disc(RADIUS[3]),
}

const PLAYER_RECTS = bitmapRects(PLAYER_ROWS)

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
          className="fill-pang-hud"
        />
      ))}
    </g>
  ))
}

function messageLines(status: Game["status"]): readonly string[] {
  switch (status) {
    case "ready":
      return ["PRESS", "START"]
    case "paused":
      return ["PAUSE"]
    case "dying":
      return ["READY"]
    case "cleared":
      return ["STAGE", "CLEAR"]
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
    contentWidth = Math.max(contentWidth, textWidth(line))
    contentHeight += FONT_HEIGHT
    if (index < lines.length - 1) contentHeight += LINE_GAP
  }
  const boxWidth = contentWidth + PAD * 2
  const boxHeight = contentHeight + PAD * 2
  const boxX = Math.floor((WIDTH - boxWidth) / 2)
  const boxY = CEILING + Math.floor((FLOOR - CEILING - boxHeight) / 2)
  const placed: { line: string; x: number; y: number }[] = []
  let cursorY = boxY + PAD
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue
    placed.push({
      line,
      x: boxX + Math.floor((boxWidth - textWidth(line)) / 2),
      y: cursorY,
    })
    cursorY += FONT_HEIGHT
    if (index < lines.length - 1) cursorY += LINE_GAP
  }
  return (
    <g>
      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} className="fill-pang-bezel" />
      <rect x={boxX + 1} y={boxY + 1} width={boxWidth - 2} height={boxHeight - 2} className="fill-pang-plate" />
      {placed.map((item) => (
        <PixelText key={item.line} text={item.line} x={item.x} y={item.y} />
      ))}
    </g>
  )
}

function Hills() {
  return (
    <g>
      <rect x={0} y={104} width={78} height={46} />
      <rect x={16} y={90} width={40} height={16} />
      <rect x={8} y={96} width={16} height={8} />
      <rect x={276} y={108} width={108} height={42} />
      <rect x={304} y={94} width={48} height={16} />
      <rect x={324} y={86} width={20} height={10} />
    </g>
  )
}

function BallSprite({ ball }: { ball: Game["balls"][number] }) {
  const radius = RADIUS[ball.size]
  const originX = Math.round(ball.x) - radius
  const originY = Math.round(ball.y) - radius
  const art = DISCS[ball.size]
  const layers = [
    ["body", art.body, "fill-pang-ball"],
    ["light", art.light, "fill-pang-ball-light"],
    ["shade", art.shade, "fill-pang-ball-shade"],
  ] as const
  return (
    <g>
      {layers.map(([name, runs, className]) =>
        runs.map((run) => (
          <rect
            key={`${name}-${run.x}-${run.y}`}
            x={originX + run.x}
            y={originY + run.y}
            width={run.w}
            height={1}
            className={className}
          />
        )),
      )}
    </g>
  )
}

function ropePoints(shot: Shot): string {
  const bottom = Math.min(FLOOR, shot.y + shot.length)
  const points: string[] = []
  let flip = false
  for (let y = shot.y; y < bottom; y += 3) {
    points.push(`${shot.x + (flip ? 1 : 0)},${Math.round(y)}`)
    flip = !flip
  }
  points.push(`${shot.x},${Math.round(bottom)}`)
  return points.join(" ")
}

function Lives({ lives }: { lives: number }) {
  const shown = Math.min(lives, 9)
  const icons = []
  for (let index = 0; index < shown; index += 1) {
    icons.push(
      <rect
        key={index}
        x={WIDTH - 8 - index * 6}
        y={3}
        width={4}
        height={4}
        className="fill-pang-life"
      />,
    )
  }
  return <g>{icons}</g>
}

export function Screen({ game }: { game: Game }) {
  const theme = themeIndex(game.level)
  const sky = SKY[theme] ?? SKY[0]
  const hill = HILL[theme] ?? HILL[0]
  const ground = GROUND[theme] ?? GROUND[0]
  const lines = messageLines(game.status)
  const showPlayer = game.invuln === 0 || game.clock % 8 < 4
  const score = String(game.score).padStart(6, "0")
  const level = `L${game.level}`

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      shapeRendering="crispEdges"
      className="block h-auto w-full"
      aria-label={`Pang board, score ${game.score}, level ${game.level}, lives ${game.lives}, balls ${game.balls.length}, status ${game.status}, player ${Math.round(game.playerX)}`}
    >
      <rect width={WIDTH} height={HEIGHT} className={sky} />
      <g className={hill}>
        <Hills />
      </g>
      <rect x={0} y={FLOOR} width={WIDTH} height={HEIGHT - FLOOR} className={ground} />
      <rect x={0} y={FLOOR} width={WIDTH} height={1} className="fill-pang-hud opacity-40" />
      {game.balls.map((ball) => (
        <BallSprite key={ball.id} ball={ball} />
      ))}
      {game.shots.map((shot) => (
        <polyline
          key={shot.id}
          points={ropePoints(shot)}
          fill="none"
          strokeWidth={1}
          className="stroke-pang-rope"
        />
      ))}
      {game.drops.map((drop) => {
        if (drop.age >= DROP_BLINK && Math.floor(drop.age / 6) % 2 === 1) return null
        return (
          <rect
            key={drop.id}
            x={Math.round(drop.x) - 4}
            y={Math.round(drop.y) - 4}
            width={8}
            height={8}
            className={BOOST_FILL[drop.kind]}
          />
        )
      })}
      {showPlayer ? (
        <g>
          {PLAYER_RECTS.map((rect) => (
            <rect
              key={`${rect.x}-${rect.y}`}
              x={Math.round(game.playerX) - PLAYER_W / 2 + rect.x}
              y={FLOOR - PLAYER_H + rect.y}
              width={rect.w}
              height={1}
              className="fill-pang-player"
            />
          ))}
        </g>
      ) : null}
      <rect width={WIDTH} height={CEILING} className="fill-pang-bezel" />
      <PixelText text={score} x={4} y={4} />
      <PixelText text={level} x={144} y={4} />
      <PixelText text={WEAPON_LABEL[game.weapon]} x={210} y={4} />
      {game.weapon === "harpoon" && game.volley > 1 ? (
        <PixelText text={String(game.volley)} x={230} y={4} />
      ) : null}
      {game.shield ? <PixelText text="S" x={252} y={4} /> : null}
      <Lives lives={game.lives} />
      {lines.length > 0 ? <MessagePlate lines={lines} /> : null}
    </svg>
  )
}
