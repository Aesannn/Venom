import React, { useState, useEffect, useRef } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Play, Pause, SkipForward, Volume2, Disc, RefreshCw, Grid } from 'lucide-react';

export const AetherAudioPlayer: React.FC = () => {
  const state = useSystemState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const [trackIndex, setTrackIndex] = useState(0);

  // 4x4 Step Sequencer state: [Row][Col]
  // Row 0: Kick, Row 1: Snare, Row 2: Hi-Hat, Row 3: Pluck
  const [sequencerGrid, setSequencerGrid] = useState<boolean[][]>([
    [true, false, false, false],  // Kick
    [false, false, true, false],  // Snare
    [false, true, false, true],   // Hi-Hat
    [true, false, true, false],   // Pluck
  ]);

  const [currentSeqStep, setCurrentSeqStep] = useState(0);

  // BPM Speed & Harmonic Scale States
  const [bpm, setBpm] = useState(100);
  const [synthScale, setSynthScale] = useState<'minor' | 'major' | 'dorian' | 'chromatic'>('minor');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gridRef = useRef<boolean[][]>(sequencerGrid);
  const volumeRef = useRef<number>(volume);
  const scaleRef = useRef(synthScale);
  const soundEnabledRef = useRef<boolean>(state.soundEnabled);

  // Sync refs to prevent stale closure reads in loops
  useEffect(() => {
    gridRef.current = sequencerGrid;
  }, [sequencerGrid]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    scaleRef.current = synthScale;
  }, [synthScale]);

  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  // Restart sequencer dynamically when BPM changes while playing
  useEffect(() => {
    if (isPlaying) {
      stopProceduralSynth();
      startProceduralSynth();
    }
  }, [bpm]);

  const tracks = [
    { name: 'ambient_hum_generator.qsh', desc: 'Resonant deep procedural hum with sequencer overlay.' },
    { name: 'harmonic_pulse_synth.sys', desc: 'Pentatonic scale progression + 4x4 beat sequencer.' },
    { name: 'generative_beat_module.exe', desc: 'High frequency sweep bursts + customized loops.' }
  ];

  // Stop sound loops on unmount
  useEffect(() => {
    return () => {
      stopProceduralSynth();
    };
  }, []);

  // Sync state processes on window minimize/close
  const win = state.windows.find(w => w.id === 'player');
  useEffect(() => {
    if (win && (!win.isOpen || win.isMinimized) && isPlaying) {
      handlePause();
    }
  }, [win]);

  // ==========================================
  // PROCEDURAL SYNTH ENGINE & SOUND BUILDERS
  // ==========================================
  const playKick = (ctx: AudioContext, time: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.28);

    const gainVal = (vol / 100) * 0.32;
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.3);
  };

  const playSnare = (ctx: AudioContext, time: number, vol: number) => {
    const bufferSize = ctx.sampleRate * 0.18;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(2, time);

    const gain = ctx.createGain();
    const gainVal = (vol / 100) * 0.16;
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.2);
  };

  const playHiHat = (ctx: AudioContext, time: number, vol: number) => {
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = ctx.createGain();
    const gainVal = (vol / 100) * 0.14;
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.05);
  };

  const playPluck = (ctx: AudioContext, time: number, vol: number, index: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    
    // Choose scale pitches dynamically based on Ref
    const currentScale = scaleRef.current;
    let scalePitches = [220.00, 261.63, 329.63, 392.00]; // Minor Pentatonic Am (A3, C4, E4, G4)
    if (currentScale === 'major') {
      scalePitches = [220.00, 246.94, 277.18, 329.63]; // Major Pentatonic A (A3, B3, C#4, E4)
    } else if (currentScale === 'dorian') {
      scalePitches = [220.00, 246.94, 261.63, 329.63]; // Dorian Cyber-Mode (A3, B3, C4, E4)
    } else if (currentScale === 'chromatic') {
      scalePitches = [220.00, 233.08, 246.94, 261.63]; // Chromatic Glitch (A3, A#3, B3, C4)
    }

    const pitch = scalePitches[index % scalePitches.length];
    osc.frequency.setValueAtTime(pitch, time);

    const gainVal = (vol / 100) * 0.12;
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.24);
  };

  const startProceduralSynth = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      
      let stepIndex = 0;

      const chords = [
        [110, 220, 261.63, 329.63], // Am
        [130.81, 261.63, 329.63, 392], // C
        [87.31, 174.61, 261.63, 349.23], // F
        [98.00, 196.00, 293.66, 392.00]  // G
      ];

      const runSequencerStep = () => {
        const time = audioCtx.currentTime;
        const currentStep = stepIndex % 4;

        // UI step sync
        setCurrentSeqStep(currentStep);

        const currentGrid = gridRef.current;
        const activeVol = volumeRef.current;
        const isSoundOn = soundEnabledRef.current;

        // Stage 1: Play Sequencer notes that are checked
        if (isSoundOn) {
          if (currentGrid[0][currentStep]) playKick(audioCtx, time, activeVol);
          if (currentGrid[1][currentStep]) playSnare(audioCtx, time, activeVol);
          if (currentGrid[2][currentStep]) playHiHat(audioCtx, time, activeVol);
          if (currentGrid[3][currentStep]) playPluck(audioCtx, time, activeVol, stepIndex);
        }

        // Stage 2: Melodic background wash (triggered on step 0 chord pad change)
        if (currentStep === 0 && isSoundOn) {
          const chordIndex = Math.floor(stepIndex / 4) % chords.length;
          const activeChord = chords[chordIndex];

          activeChord.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = idx === 0 ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(freq, time);

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(idx === 0 ? 120 : 600, time);
            filter.frequency.exponentialRampToValueAtTime(idx === 0 ? 250 : 1200, time + 1.2);

            const padVol = (activeVol / 100) * 0.025;
            gain.gain.setValueAtTime(padVol, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.9);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(time);
            osc.stop(time + 2.0);
          });
        }

        stepIndex++;
      };

      runSequencerStep();
      // Tick sequencer dynamically based on active BPM speed
      const stepMs = Math.round(60000 / (bpm * 2)); // 8th note spacing
      synthTimerRef.current = setInterval(runSequencerStep, stepMs);

    } catch (e) {
      console.warn('Procedural synth trigger failed', e);
    }
  };

  const stopProceduralSynth = () => {
    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    setCurrentSeqStep(0);
  };

  const handlePlay = () => {
    playSound.click();
    setIsPlaying(true);
    startProceduralSynth();
    store.addNotification('Procedural Synthesizer Active', `Playing ${tracks[trackIndex].name} procedurally.`, 'Just now');
  };

  const handlePause = () => {
    playSound.click();
    setIsPlaying(false);
    stopProceduralSynth();
  };

  const handleSkip = () => {
    playSound.click();
    const nextIdx = (trackIndex + 1) % tracks.length;
    setTrackIndex(nextIdx);
    if (isPlaying) {
      stopProceduralSynth();
      startProceduralSynth();
    }
  };

  const toggleSequencerStep = (row: number, col: number) => {
    playSound.click();
    setSequencerGrid(prev => {
      const next = prev.map((r, rIdx) => 
        r.map((val, cIdx) => (rIdx === row && cIdx === col ? !val : val))
      );
      return next;
    });
  };

  // Canvas waveform visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 340);
    const height = (canvas.height = 55);

    let animationFrameId: number;
    let frames = 0;

    const drawBars = () => {
      ctx.clearRect(0, 0, width, height);

      let colorRgb = '0, 240, 255';
      switch (state.theme) {
        case 'purple': colorRgb = '217, 70, 239'; break;
        case 'green': colorRgb = '16, 185, 129'; break;
        case 'orange': colorRgb = '249, 115, 22'; break;
      }

      ctx.fillStyle = `rgba(${colorRgb}, 0.85)`;
      const barWidth = 3;
      const spacing = 2;
      const barCount = Math.floor(width / (barWidth + spacing));

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          const sineSeed = Math.sin(i * 0.15 + frames * 0.1);
          const noiseSeed = Math.random() * 8;
          barHeight = Math.max(4, Math.abs(sineSeed * 30) + noiseSeed);
        }

        const x = i * (barWidth + spacing);
        const y = height - barHeight;

        ctx.fillRect(x, y, barWidth, barHeight);
      }

      frames++;
      animationFrameId = requestAnimationFrame(drawBars);
    };

    drawBars();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, state.theme]);

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const accentTheme = 
    state.theme === 'purple' ? 'border-purple-500 text-purple-400 focus:border-purple-400 hover:bg-purple-500/10' :
    state.theme === 'green' ? 'border-emerald-500 text-emerald-400 focus:border-emerald-400 hover:bg-emerald-500/10' :
    state.theme === 'orange' ? 'border-orange-500 text-orange-400 focus:border-orange-400 hover:bg-orange-500/10' :
    'border-cyan-500 text-cyan-400 focus:border-cyan-400 hover:bg-cyan-500/10';

  const stepHighlight =
    state.theme === 'purple' ? 'bg-purple-500/20 text-purple-200 border-purple-400' :
    state.theme === 'green' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400' :
    state.theme === 'orange' ? 'bg-orange-500/20 text-orange-200 border-orange-400' :
    'bg-cyan-500/20 text-cyan-200 border-cyan-400';

  const activeColor =
    state.theme === 'purple' ? 'bg-purple-500 shadow-neon-purple border-purple-400 animate-pulse' :
    state.theme === 'green' ? 'bg-emerald-500 shadow-neon-green border-emerald-400 animate-pulse' :
    state.theme === 'orange' ? 'bg-orange-500 shadow-neon-orange border-orange-400 animate-pulse' :
    'bg-cyan-500 shadow-neon-cyan border-cyan-400 animate-pulse';

  const labels = ['K', 'S', 'H', 'P'];
  const channelDescs = ['Kick Drum', 'Snare Noise', 'Hihat Cymbal', 'Synth Pluck'];

  return (
    <div className={`flex-1 p-3 bg-[#07090c]/90 text-xs font-mono h-full flex flex-col justify-between select-none theme-${state.theme} overflow-y-auto`}>
      
      {/* Top Spinning disc visualizer */}
      <div className="flex items-center space-x-3 border border-white/5 bg-[#0a0c10]/40 rounded p-2.5 relative overflow-hidden">
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-black/50 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }}>
            <Disc className="w-7 h-7 text-white/20" />
            <div className="absolute w-3 h-3 rounded-full bg-[#07090c] border border-white/10" />
          </div>
        </div>

        <div className="space-y-0.5 overflow-hidden flex-1">
          <span className={`text-[8px] uppercase font-bold tracking-widest ${textTheme} animate-pulse`}>
            {isPlaying ? 'ACTIVE' : 'STANDBY'}
          </span>
          <h3 className="text-white font-bold truncate text-[10px] uppercase tracking-wider">{tracks[trackIndex].name}</h3>
          <p className="text-[8px] text-white/40 leading-normal truncate">{tracks[trackIndex].desc}</p>
        </div>
      </div>

      {/* Waveform Equalizer Canvas */}
      <div className="border border-white/5 bg-[#030406] rounded p-1.5 overflow-hidden h-12 flex items-end my-1">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* 4x4 Interactive Cyber Step Sequencer */}
      <div className="border border-white/5 bg-[#080a0d]/70 rounded p-2.5 space-y-2 my-1">
        <div className="flex justify-between items-center text-[9px] text-white/40 uppercase tracking-widest pl-1 font-bold">
          <div className="flex items-center space-x-1.5">
            <Grid className="w-3.5 h-3.5 text-current" />
            <span>4x4 Synthesizer Sequencer</span>
          </div>
          <span className={textTheme}>TEMPO: {bpm} BPM</span>
        </div>

        <div className="space-y-1.5 relative">
          {sequencerGrid.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center space-x-2">
              {/* Channel Label */}
              <div 
                className="w-4 h-6 flex items-center justify-center font-bold text-white/50 text-[10px] border border-white/5 rounded bg-black/30"
                title={channelDescs[rIdx]}
              >
                {labels[rIdx]}
              </div>

              {/* Steps Toggle Grid row */}
              <div className="flex-1 grid grid-cols-4 gap-1.5 relative">
                {row.map((isChecked, cIdx) => {
                  const isCurrent = currentSeqStep === cIdx;
                  return (
                    <button
                      key={cIdx}
                      onClick={() => toggleSequencerStep(rIdx, cIdx)}
                      className={`h-6 border rounded transition-all duration-150 relative active:scale-95 flex items-center justify-center ${
                        isChecked 
                          ? activeColor + ' text-black' 
                          : 'border-white/10 hover:border-white/30 text-white/20'
                      } ${isCurrent && !isChecked ? stepHighlight : ''}`}
                    >
                      {isCurrent && (
                        <span className="absolute inset-0 border border-white rounded animate-ping pointer-events-none opacity-55" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BPM & Scale Synthesizer Controls */}
      <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-2 pb-1 bg-black/10 px-2 py-1.5 rounded my-1 border border-white/5">
        {/* BPM Slider */}
        <div className="space-y-1 flex flex-col justify-center">
          <span className="text-[8px] text-white/40 uppercase tracking-widest pl-0.5 font-bold">BPM Speed: {bpm}</span>
          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full bg-[#050608] accent-current cursor-pointer h-1 rounded text-current outline-none"
            style={{ color: 'var(--theme-color)' }}
          />
        </div>

        {/* Scale Dropdown */}
        <div className="space-y-1 flex flex-col justify-center">
          <span className="text-[8px] text-white/40 uppercase tracking-widest pl-0.5 font-bold">Pluck Scale</span>
          <select
            value={synthScale}
            onChange={(e) => setSynthScale(e.target.value as any)}
            className="w-full bg-[#050608]/90 border border-white/10 rounded px-1.5 py-0.5 outline-none font-mono text-[8px] uppercase tracking-wider text-white focus:border-current cursor-pointer"
          >
            <option value="minor">Natural Minor</option>
            <option value="major">Natural Major</option>
            <option value="dorian">Dorian Mode</option>
            <option value="chromatic">Chromatic Scale</option>
          </select>
        </div>
      </div>

      {/* Control panel deck buttons */}
      <div className="space-y-2.5">
        <div className="space-y-1">
          <div className="w-full bg-[#050608] border border-white/5 h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-current ${isPlaying ? 'w-[75%]' : 'w-[10%]'}`} 
              style={{ color: 'var(--theme-color)', transition: isPlaying ? 'width 6s linear' : 'width 0.2s ease' }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-white/25">
            <span>{isPlaying ? `STEP_${currentSeqStep + 1}` : 'STEP_0'}</span>
            <span>PRO_LOOP</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-white/60 hover:text-white transition active:scale-95"
            title="Skip Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className={`px-6 py-2 border rounded text-black bg-current hover:opacity-90 font-bold transition flex items-center space-x-1.5 active:scale-95 ${accentTheme}`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="uppercase tracking-widest text-[9px]">Play Loop</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className={`px-6 py-2 border rounded text-black bg-current hover:opacity-90 font-bold transition flex items-center space-x-1.5 active:scale-95 ${accentTheme}`}
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="uppercase tracking-widest text-[9px]">Pause Deck</span>
            </button>
          )}

          <button
            onClick={() => { playSound.click(); }}
            className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-white/60 hover:text-white transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center space-x-2 text-white/40 px-1 border-t border-white/5 pt-2">
          <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="w-full bg-[#050608] accent-current cursor-pointer h-1 rounded"
            style={{ color: 'var(--theme-color)' }}
          />
          <span className="text-[8px] font-bold w-5 text-right select-none">{volume}%</span>
        </div>
      </div>

    </div>
  );
};
