const faces = {
  playing: "🙂",
  pressing: "😮",
  won: "😎",
  lost: "😵",
} as const

export function FaceButton({
  face,
  onClick,
}: {
  face: "playing" | "pressing" | "won" | "lost"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label="New game"
      onClick={onClick}
      className="flex size-10 cursor-pointer items-center justify-center border-2 border-t-mine-bevel-light border-r-mine-bevel-dark border-b-mine-bevel-dark border-l-mine-bevel-light bg-mine-tile text-2xl select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:border-t-mine-bevel-dark active:border-r-mine-bevel-light active:border-b-mine-bevel-light active:border-l-mine-bevel-dark"
    >
      {faces[face]}
    </button>
  )
}
