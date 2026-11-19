type SoundKind = "move" | "rotate" | "lock" | "line" | "tetris" | "die"

const SOUNDS: Record<SoundKind, readonly { frequency: number; duration: number }[]> = {
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
}

let audioContext: AudioContext | undefined

function getAudioContext(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") return undefined
  audioContext ??= new AudioContext()
  return audioContext
}

function playTone(context: AudioContext, frequency: number, when: number, duration: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = "square"
  oscillator.frequency.value = frequency
  gain.gain.value = 0.04
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(when)
  oscillator.stop(when + duration)
}

export function playSound(kind: SoundKind): void {
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === "suspended") void context.resume()
    let when = context.currentTime
    for (const tone of SOUNDS[kind]) {
      playTone(context, tone.frequency, when, tone.duration)
      when += tone.duration
    }
  } catch {
    return
  }
}
