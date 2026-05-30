// Procedural Sound Synthesizer using Web Audio API
// Ensures zero reliance on external asset loading

let audioCtx: AudioContext | null = null;
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
let soundEnabled = true;

export const setSoundEnabled = (val: boolean) => {
  soundEnabled = val;
  if (!val) {
    playSound.stopAmbientHum();
  }
};

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const playSound = {
  click: () => {
    // Deleted tap sounds globally to avoid noise loops
  },

  keypress: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Add subtle pitch variation for keyboard realism
      const pitch = 800 + Math.random() * 200;
      osc.frequency.setValueAtTime(pitch, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.03);

      gain.gain.setValueAtTime(0.005, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.04);
    } catch (e) {
      // Audio failed
    }
  },

  boot: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      // Synth sweep 1 (Fundamental deep rumble)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, time); // A1
      osc1.frequency.exponentialRampToValueAtTime(110, time + 2.0); // A2

      gain1.gain.setValueAtTime(0.001, time);
      gain1.gain.linearRampToValueAtTime(0.12, time + 0.5);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 2.2);

      // Filter sweep
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(10, time);
      filter.frequency.setValueAtTime(100, time);
      filter.frequency.exponentialRampToValueAtTime(1200, time + 1.2);

      // Chime sweep (Futuristic high harmonic fifths)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, time); // A4
      osc2.frequency.exponentialRampToValueAtTime(1650, time + 1.8); // E6 (harmonic fifth)

      gain2.gain.setValueAtTime(0.001, time);
      gain2.gain.linearRampToValueAtTime(0.04, time + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

      // Connect nodes
      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(time);
      osc1.stop(time + 2.3);

      osc2.start(time);
      osc2.stop(time + 2.1);
    } catch (e) {
      console.warn('Audio boot failed', e);
    }
  },

  unlock: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      // Retro-futuristic laser sweep up
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(1760, time + 0.6);

      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.7);
    } catch (e) {
      console.warn('Audio unlock failed', e);
    }
  },

  success: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      // Cyber chime chord
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time + idx * 0.05);

        gain.gain.setValueAtTime(0.015, time + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + idx * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time + idx * 0.05);
        osc.stop(time + idx * 0.05 + 0.45);
      });
    } catch (e) {
      // Audio failed
    }
  },

  warning: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(140, time);
      osc2.frequency.setValueAtTime(143, time); // slightly detuned for tension

      gain.gain.setValueAtTime(0.03, time);
      gain.gain.linearRampToValueAtTime(0.03, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(time);
      osc2.start(time);

      osc1.stop(time + 0.4);
      osc2.stop(time + 0.4);
    } catch (e) {
      // Audio failed
    }
  },

  startAmbientHum: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (ambientOsc) return; // already humming

      const time = ctx.currentTime;
      ambientOsc = ctx.createOscillator();
      ambientGain = ctx.createGain();

      ambientOsc.type = 'sine';
      // Low server rack 60Hz hum
      ambientOsc.frequency.setValueAtTime(60, time);

      // Low pass filter to make it extremely soft
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, time);

      // Very quiet, almost imperceptible background vibration
      ambientGain.gain.setValueAtTime(0.015, time);

      ambientOsc.connect(filter);
      filter.connect(ambientGain);
      ambientGain.connect(ctx.destination);

      ambientOsc.start(time);
    } catch (e) {
      // Ambient hum failed
    }
  },

  stopAmbientHum: () => {
    try {
      if (ambientOsc) {
        ambientOsc.stop();
        ambientOsc.disconnect();
        ambientOsc = null;
      }
      if (ambientGain) {
        ambientGain.disconnect();
        ambientGain = null;
      }
    } catch (e) {
      // Audio failed
    }
  },

  magnetSnap: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, time);
      osc.frequency.exponentialRampToValueAtTime(800, time + 0.02);
      
      gain.gain.setValueAtTime(0.012, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.03);
    } catch (e) {
      // Failed
    }
  },

  workspaceSweep: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, time);
      osc.frequency.exponentialRampToValueAtTime(160, time + 0.55);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, time);
      filter.frequency.exponentialRampToValueAtTime(380, time + 0.45);
      
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.04, time + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
      
      if (panner) {
        panner.pan.setValueAtTime(-0.8, time);
        panner.pan.linearRampToValueAtTime(0.8, time + 0.55);
        osc.connect(filter);
        filter.connect(panner);
        panner.connect(gain);
      } else {
        osc.connect(filter);
        filter.connect(gain);
      }
      
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.65);
    } catch (e) {
      // Failed
    }
  },

  windowRecede: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, time);
      osc.frequency.exponentialRampToValueAtTime(160, time + 0.4);
      
      gain.gain.setValueAtTime(0.015, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.45);
    } catch (e) {
      // Failed
    }
  },

  speakText: (text: string, onEnd?: () => void) => {
    if (!soundEnabled) {
      if (onEnd) onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Only remove leading/trailing whitespace, keep symbols
      const cleanText = text.trim();

      if (!cleanText) {
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.volume = 0.45;
      utterance.pitch = 0.85;
      utterance.rate = 1.05;

      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }

      // Improved voice selection with multiple fallbacks
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;

      // First, try to find a voice with "Google" or "Microsoft" or "David" in the name
      const preferredVoice = voices.find(v =>
        v.name.includes('Google US English') ||
        v.name.includes('Microsoft David') ||
        v.name.includes('Male') ||
        v.name.includes('Female') ||
        v.name.includes('en-US')
      );

      if (preferredVoice) {
        selectedVoice = preferredVoice;
      } else {
        // Fallback: try to find any voice with "en" or "English" in the lang property
        const englishVoice = voices.find(v =>
          v.lang && (v.lang.includes('en') || v.lang.includes('English'))
        );
        if (englishVoice) {
          selectedVoice = englishVoice;
        } else if (voices.length > 0) {
          // Last resort: use the first available voice
          selectedVoice = voices[0];
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Voice synthesis failed', e);
      if (onEnd) onEnd();
    }
  }
};

// Shared system controller to unlock voice permissions via user click gesture
export const bootVenomVoiceCore = async () => {
  try {
    // 1. Force the browser to request mic streaming permission during the click event
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop the stream tracks immediately since we only needed to unlock permission
    stream.getTracks().forEach(track => track.stop());
    
    console.log("Venom voice core permissions successfully unlocked.");
    return true;
  } catch (err) {
    console.error("Voice core initialization failed: User rejected mic.", err);
    return false;
  }
};

