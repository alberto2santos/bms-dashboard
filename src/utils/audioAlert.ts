let context: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: ReturnType<typeof setInterval> | null = null;
let sirenHigh = false;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return null;
  context ??= new AudioContextConstructor();
  return context;
};

export const primeAudio = async () => {
  const audioContext = getAudioContext();
  if (audioContext?.state === "suspended") await audioContext.resume();
};

export const startSiren = async () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  if (audioContext.state === "suspended") await audioContext.resume();
  if (sirenOscillator) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = 760;
  gain.gain.value = 0.035;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();

  sirenOscillator = oscillator;
  sirenGain = gain;
  sirenHigh = false;
  sirenInterval = setInterval(() => {
    if (!sirenOscillator || !context) return;
    sirenHigh = !sirenHigh;
    sirenOscillator.frequency.setTargetAtTime(sirenHigh ? 980 : 620, context.currentTime, 0.08);
  }, 520);
};

export const stopSiren = () => {
  if (sirenInterval) clearInterval(sirenInterval);
  sirenInterval = null;
  if (sirenOscillator && context) {
    sirenGain?.gain.setTargetAtTime(0, context.currentTime, 0.05);
    sirenOscillator.stop(context.currentTime + 0.2);
    sirenOscillator = null;
    sirenGain = null;
  }
};

export const playAckTone = async () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  if (audioContext.state === "suspended") await audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(1174, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.22);
};

export const playSwitchTone = async () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  if (audioContext.state === "suspended") await audioContext.resume();

  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(520, now);
  oscillator.frequency.exponentialRampToValueAtTime(190, now + 0.045);
  filter.type = "lowpass";
  filter.frequency.value = 1_800;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.022, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.07);
};
