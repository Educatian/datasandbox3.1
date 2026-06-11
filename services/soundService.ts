// Tiny WebAudio arcade sound layer: synthesized chimes, no audio assets.
// Muted state persists in localStorage; everything no-ops if WebAudio is
// unavailable or the user has not interacted yet (autoplay policy).

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
    try {
        if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    } catch {
        return null;
    }
};

const MUTE_KEY = 'ds_sound_muted';

export const isMuted = (): boolean => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

export const setMuted = (muted: boolean) => {
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { }
};

const tone = (freq: number, startAt: number, duration: number, volume = 0.12, type: OscillatorType = 'sine') => {
    const ac = getCtx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ac.currentTime + startAt;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
};

/** Mission complete: ascending arcade arpeggio (C5-E5-G5-C6). */
export const playMissionComplete = () => {
    if (isMuted()) return;
    tone(523.25, 0, 0.18, 0.1, 'triangle');
    tone(659.25, 0.09, 0.18, 0.1, 'triangle');
    tone(783.99, 0.18, 0.18, 0.1, 'triangle');
    tone(1046.5, 0.27, 0.35, 0.12, 'triangle');
};

/** Prediction locked in: short two-note confirm. */
export const playCommit = () => {
    if (isMuted()) return;
    tone(659.25, 0, 0.1, 0.08, 'square');
    tone(987.77, 0.08, 0.16, 0.08, 'square');
};

/** Soft tick for small positive feedback. */
export const playTick = () => {
    if (isMuted()) return;
    tone(880, 0, 0.06, 0.05, 'sine');
};
