let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) {
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

export function buzz(pattern: number | number[]) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern as any);
  } catch {}
}

export function tone(freq = 440, duration = 120, volume = 0.05) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    osc.disconnect();
    gain.disconnect();
  }, duration);
}

export function clickFeedback() {
  buzz(10);
  tone(660, 40, 0.03);
}

export function notifyFeedback() {
  buzz([10, 40, 10]);
  tone(520, 120, 0.05);
}
