import { createSoundPlayer } from "@/games/shared/sound"

export const playSound = createSoundPlayer({
  eat: [{ frequency: 880, duration: 0.04 }],
  bonus: [
    { frequency: 660, duration: 0.05 },
    { frequency: 990, duration: 0.05 },
  ],
  die: [
    { frequency: 440, duration: 0.12 },
    { frequency: 330, duration: 0.12 },
    { frequency: 220, duration: 0.12 },
  ],
})
