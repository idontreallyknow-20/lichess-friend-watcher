// A short two-note chime synthesized with the Web Audio API, so no audio asset
// needs to ship. Used for the optional new-game sound alert.

export function playChime(): void {
  try {
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const notes = [
      { freq: 660, start: 0 },
      { freq: 880, start: 0.13 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      const t = now + note.start;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    }

    // Close the context shortly after the sound finishes.
    window.setTimeout(() => ctx.close().catch(() => undefined), 800);
  } catch {
    // Audio not available; ignore.
  }
}
