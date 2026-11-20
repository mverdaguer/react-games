import { createSoundPlayer } from "@/games/shared/sound"

export const playSound = createSoundPlayer({
  move: [{ frequency: 220, duration: 0.03 }],
  rotate: [{ frequency: 330, duration: 0.04 }],
  lock: [{ frequency: 110, duration: 0.05 }],
  line: [
    { frequency: 523, duration: 0.06 },
    { frequency: 659, duration: 0.06 },
  ],
  tetris: [
    { frequency: 523, duration: 0.07 },
    { frequency: 659, duration: 0.07 },
    { frequency: 784, duration: 0.07 },
  ],
  die: [
    { frequency: 440, duration: 0.12 },
    { frequency: 330, duration: 0.12 },
    { frequency: 220, duration: 0.12 },
  ],
})
