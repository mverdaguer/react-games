export type Tone = { frequency: number; duration: number }

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

export function createSoundPlayer<Kind extends string>(
  sounds: Record<Kind, readonly Tone[]>,
): (kind: Kind) => void {
  return (kind) => {
    try {
      const context = getAudioContext()
      if (!context) return
      if (context.state === "suspended") void context.resume()
      let when = context.currentTime
      for (const tone of sounds[kind]) {
        playTone(context, tone.frequency, when, tone.duration)
        when += tone.duration
      }
    } catch {
      return
    }
  }
}
