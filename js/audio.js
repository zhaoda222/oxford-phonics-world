// Web Audio API Sound Effects + Online American English Audio + Speech Synthesis Fallback
class SoundManager {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.ttsEnabled = true;
    this.speechRate = 0.85;
    this.speechPitch = 1.1;
    this.selectedVoice = null;
    this.activeAudio = null;
    this.unlocked = false;

    this.initVoices();
    this.setupMobileUnlock();
  }

  // Unlock audio context and audio playback on mobile touch
  setupMobileUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.unlocked) return;
      this.initContext();

      if (this.ctx) {
        try {
          const buffer = this.ctx.createBuffer(1, 1, 22050);
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx.destination);
          source.start(0);
        } catch (e) {}
      }

      if ('speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance(' ');
          utter.volume = 0.01;
          window.speechSynthesis.speak(utter);
        } catch (e) {}
      }

      this.unlocked = true;
      ['touchstart', 'touchend', 'click'].forEach(evt => {
        document.removeEventListener(evt, unlock, true);
      });
    };

    ['touchstart', 'touchend', 'click'].forEach(evt => {
      document.addEventListener(evt, unlock, { once: false, passive: true, capture: true });
    });
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
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      this.playBeep(freq, 'sine', 0.18, 0.15, idx * 0.08);
    });
  }

  wrong() {
    if (!this.sfxEnabled) return;
    this.initContext();
    this.playBeep(220, 'sawtooth', 0.18, 0.12, 0);
    this.playBeep(180, 'sawtooth', 0.22, 0.12, 0.14);
  }

  star() {
    if (!this.sfxEnabled) return;
    this.initContext();
    const notes = [659.25, 830.61, 987.77, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      this.playBeep(freq, 'triangle', 0.25, 0.12, idx * 0.06);
    });
  }

  levelComplete() {
    if (!this.sfxEnabled) return;
    this.initContext();
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

  // Online human voice audio URLs (Type 2 = American English)
  getOnlineAudioUrls(word) {
    const clean = word.toLowerCase().trim().replace(/[^a-zA-Z\s-]/g, '');
    if (!clean) return [];
    const encoded = encodeURIComponent(clean);
    return [
      'https://dict.youdao.com/dictvoice?audio=' + encoded + '&type=2',
      'https://ssl.gstatic.com/dictionary/static/sounds/20200429/' + encoded + '--_us_1.mp3'
    ];
  }

  // Play cloud real MP3 audio first, fallback to TTS
  speak(text, onEnd = null, rateOverride = null) {
    if (!this.ttsEnabled) {
      if (onEnd) setTimeout(onEnd, 300);
      return;
    }

    this.initContext();

    const isStandardWord = /^[a-zA-Z]+(\s+[a-zA-Z]+)*$/.test(text.trim());
    if (isStandardWord && typeof Audio !== 'undefined') {
      this.playCloudAudio(text.trim(), onEnd, () => {
        this.speakTTS(text, onEnd, rateOverride);
      });
    } else {
      this.speakTTS(text, onEnd, rateOverride);
    }
  }

  playCloudAudio(word, onEnd, onFail) {
    const urls = this.getOnlineAudioUrls(word);
    let urlIdx = 0;
    let finished = false;

    const stopActive = () => {
      if (this.activeAudio) {
        try {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
        } catch (e) {}
        this.activeAudio = null;
      }
    };

    const tryNext = () => {
      if (urlIdx >= urls.length) {
        if (!finished) {
          finished = true;
          onFail();
        }
        return;
      }

      stopActive();
      const audio = new Audio();
      this.activeAudio = audio;
      let timer = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        audio.oncanplaythrough = null;
        audio.onended = null;
        audio.onerror = null;
      };

      timer = setTimeout(() => {
        cleanup();
        urlIdx++;
        tryNext();
      }, 2500);

      audio.onended = () => {
        cleanup();
        if (!finished) {
          finished = true;
          this.activeAudio = null;
          if (onEnd) onEnd();
        }
      };

      audio.onerror = () => {
        cleanup();
        urlIdx++;
        tryNext();
      };

      audio.src = urls[urlIdx];
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Audio play rejection:', err);
          cleanup();
          urlIdx++;
          tryNext();
        });
      }
    };

    tryNext();
  }

  speakTTS(text, onEnd = null, rateOverride = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) setTimeout(onEnd, 400);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      let pronounceText = text;
      if (pronounceText === 'a_e') pronounceText = 'ay';
      if (pronounceText === 'i_e') pronounceText = 'eye';
      if (pronounceText === 'o_e') pronounceText = 'oh';
      if (pronounceText === 'u_e') pronounceText = 'you';

      const utter = new SpeechSynthesisUtterance(pronounceText);
      utter.lang = 'en-US';
      if (this.selectedVoice) utter.voice = this.selectedVoice;
      utter.rate = rateOverride || this.speechRate;
      utter.pitch = this.speechPitch;

      let called = false;
      const finish = () => {
        if (!called) {
          called = true;
          if (onEnd) onEnd();
        }
      };

      utter.onend = finish;
      utter.onerror = finish;
      setTimeout(finish, 2000);

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS speak error:', e);
      if (onEnd) onEnd();
    }
  }

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
        this.speakTTS(part, () => {
          setTimeout(speakNext, 250);
        }, 0.75);
      } else {
        setTimeout(() => {
          this.correct();
          this.speak(fullWord, callback, 0.85);
        }, 350);
      }
    };
    speakNext();
  }
}

const audioMgr = new SoundManager();
if (typeof module !== 'undefined') module.exports = SoundManager;
