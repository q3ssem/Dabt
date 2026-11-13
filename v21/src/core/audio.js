// No recorded audio ships with this build. Effects are short synthesised tones
// (WebAudio) started only after a user gesture; narration uses the browser's
// speech synthesis when an Arabic voice is available. Nothing waits on audio.
let ctx = null; let settings = { sound: true, narration: false };
export function setAudioSettings(s) { settings = s; }

export function sfx(kind) {
  if (!settings.sound) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const tones = { tap: [[660, .05]], ok: [[523, .09], [784, .14]], err: [[330, .12], [294, .14]], card: [[784, .08], [988, .08], [1175, .16]] }[kind] || [[600, .05]];
    let t = ctx.currentTime;
    for (const [f, d] of tones) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); t += d;
    }
  } catch { /* audio unavailable: visual feedback remains */ }
}

export function speechInfo() {
  const synth = window.speechSynthesis;
  if (!synth) return { available: false, voice: null };
  const voices = synth.getVoices() || [];
  const voice = voices.find(v => /^ar/i.test(v.lang)) || null;
  return { available: !!voice, voice };
}

export function speak(text) {
  const { available, voice } = speechInfo();
  if (!available) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.voice = voice; u.lang = voice.lang; u.rate = 0.95;
  window.speechSynthesis.speak(u); return true;
}
export function stopSpeech() { try { window.speechSynthesis?.cancel(); } catch { } }
