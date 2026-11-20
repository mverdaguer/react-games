import { createSoundPlayer } from "@/games/shared/sound"

export const playSound = createSoundPlayer({
  shoot: [{ frequency: 660, duration: 0.03 }],
  pop: [
    { frequency: 392, duration: 0.04 },
    { frequency: 523, duration: 0.05 },
  ],
  boost: [
    { frequency: 523, duration: 0.05 },
    { frequency: 659, duration: 0.05 },
    { frequency: 784, duration: 0.07 },
  ],
  die: [
    { frequency: 440, duration: 0.1 },
    { frequency: 330, duration: 0.1 },
    { frequency: 220, duration: 0.14 },
  ],
  clear: [
    { frequency: 523, duration: 0.07 },
    { frequency: 659, duration: 0.07 },
    { frequency: 784, duration: 0.07 },
    { frequency: 1046, duration: 0.12 },
  ],
})
