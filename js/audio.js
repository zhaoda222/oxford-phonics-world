// Web Audio API Sound Effects + Web Speech API (TTS) Engine
class SoundManager {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.ttsEnabled = true;
    this.speechRate = 0.85; // Slightly slower for kids phonics learning
    this.speechPitch = 1.1; // Friendly pitch
    this.selectedVoice = null;
    this.initVoices();
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Look for clean English voices (en-US or en-GB)
        const enUS = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Zira')));
        const anyUS = voices.find(v => v.lang === 'en-US');
        const anyEN = voices.find(v => v.lang.startsWith('en'));
        this.selectedVoice = enUS || anyUS || anyEN || voices[0] || null;
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }

  playBeep(freq, type = 'sine', duration = 0.15, gainVal = 0.15, startTime = 0) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  click() {
    this.playBeep(600, 'triangle', 0.05, 0.08);
  }

  pop() {
    this.playBeep(850, 'sine', 0.08, 0.12);
  }

  correct() {
    if (!this.sfxEnabled) return;
    this.initContext();
    // Cheerful ascending arpeggio (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      this.playBeep(freq, 'sine', 0.18, 0.15, idx * 0.08);
    });
  }

  wrong() {
    if (!this.sfxEnabled) return;
    this.initContext();
    // Low double buzz
    this.playBeep(220, 'sawtooth', 0.18, 0.12, 0);
    this.playBeep(180, 'sawtooth', 0.22, 0.12, 0.14);
  }

  star() {
    if (!this.sfxEnabled) return;
    this.initContext();
    // Magical sparkle chords
    const notes = [659.25, 830.61, 987.77, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      this.playBeep(freq, 'triangle', 0.25, 0.12, idx * 0.06);
    });
  }

  levelComplete() {
    if (!this.sfxEnabled) return;
    this.initContext();
    // Victory fanfare
    const chords = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 0.12 },
      { f: 783.99, t: 0.24 },
      { f: 1046.50, t: 0.36 },
      { f: 880.00, t: 0.6 },
      { f: 1046.50, t: 0.75 }
    ];
    chords.forEach(c => {
      this.playBeep(c.f, 'sine', 0.35, 0.18, c.t);
    });
  }

  speak(text, onEnd = null, rateOverride = null) {
    if (!this.ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) setTimeout(onEnd, 500);
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      if (this.selectedVoice) utter.voice = this.selectedVoice;
      utter.rate = rateOverride || this.speechRate;
      utter.pitch = this.speechPitch;

      if (onEnd) {
        utter.onend = onEnd;
        utter.onerror = () => { if (onEnd) onEnd(); };
      }

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS speak error:', e);
      if (onEnd) onEnd();
    }
  }

  // Spell phonics parts one by one, then say the whole word
  // e.g., ["c", "a", "t"] -> "k", "æ", "t" -> "cat!"
  spellPhonics(breakdown, fullWord, callback) {
    if (!breakdown || breakdown.length === 0) {
      this.speak(fullWord, callback);
      return;
    }

    let idx = 0;
    const speakNext = () => {
      if (idx < breakdown.length) {
        const part = breakdown[idx];
        idx++;
        this.speak(part, () => {
          setTimeout(speakNext, 250);
        }, 0.75);
      } else {
        // Finally blend and say full word
        setTimeout(() => {
          this.correct();
          this.speak(fullWord, callback, 0.85);
        }, 300);
      }
    };
    speakNext();
  }
}

const audioMgr = new SoundManager();
if (typeof module !== 'undefined') module.exports = SoundManager;
