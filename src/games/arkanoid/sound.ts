import { createSoundPlayer } from "@/games/shared/sound"

export const playSound = createSoundPlayer({
  bounce: [{ frequency: 740, duration: 0.03 }],
  brick: [{ frequency: 880, duration: 0.04 }],
  silver: [
    { frequency: 620, duration: 0.04 },
    { frequency: 880, duration: 0.04 },
  ],
  capsule: [
    { frequency: 523, duration: 0.05 },
    { frequency: 784, duration: 0.07 },
  ],
  laser: [{ frequency: 1320, duration: 0.03 }],
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
