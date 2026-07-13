// Web Audio API Retro Synth Engine
// Generates looping chiptune BGM and retro SFX programmatically without assets

const NOTES = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, Dsh3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Gsh3: 207.65, A3: 220.00, Ash3: 233.08, B3: 246.94,
  C4: 261.63, Csh4: 277.18, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, Gsh4: 415.30, A4: 440.00, Ash4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Dsh5: 622.25, E5: 659.25, F5: 698.46, Fsh5: 739.99, G5: 783.99, Gsh5: 830.61, A5: 880.00, Ash5: 932.33, B5: 987.77,
  C6: 1046.50, D6: 1174.66, Dsh6: 1244.51
};

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.currentTheme = null;
    this.sequencerInterval = null;
    this.bgmVolume = null;
    this.sfxVolume = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Setup BGM Volume Node
      this.bgmVolume = this.ctx.createGain();
      this.bgmVolume.gain.setValueAtTime(0.12, this.ctx.currentTime); // keep BGM soft
      this.bgmVolume.connect(this.ctx.destination);

      // Setup SFX Volume Node
      this.sfxVolume = this.ctx.createGain();
      this.sfxVolume.gain.setValueAtTime(this.soundEnabled ? 0.35 : 0, this.ctx.currentTime);
      this.sfxVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  toggleSound(enabled) {
    this.soundEnabled = enabled;
    this.init();
    if (this.sfxVolume) {
      this.sfxVolume.gain.setValueAtTime(enabled ? 0.35 : 0, this.ctx.currentTime);
    }
  }

  toggleMusic(enabled) {
    this.musicEnabled = enabled;
    this.init();
    if (!enabled) {
      this.stopBGM();
    } else if (this.currentTheme) {
      this.playBGM(this.currentTheme);
    }
  }

  playSynthNote(freq, type = 'square', duration = 0.15, gainVal = 0.05) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.bgmVolume);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoiseSFX(duration = 0.08, volume = 0.2) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.Q.setValueAtTime(1, this.ctx.currentTime);
      
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxVolume);
      
      noiseNode.start();
    } catch (err) {
      console.error(err);
    }
  }

  playSFX(type) {
    this.init();
    if (!this.soundEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    switch (type) {
      case 'slash':
      case 'hit': {
        // Pitch drop + short noise burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        osc.start();
        osc.stop(now + 0.08);
        this.playNoiseSFX(0.06, 0.12);
        break;
      }
      case 'heal': {
        // Ascending slide with rapid vibrato (LFO)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.45);
        
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(22, now);
        lfoGain.gain.setValueAtTime(25, now);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        lfo.start();
        osc.start();
        lfo.stop(now + 0.45);
        osc.stop(now + 0.45);
        break;
      }
      case 'cast': {
        // High to low sliding sawtooth
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
        
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        osc.start();
        osc.stop(now + 0.35);
        break;
      }
      case 'levelup': {
        // Major chord fanfare: C -> E -> G -> C
        const chord = [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5];
        chord.forEach((freq, idx) => {
          setTimeout(() => {
            if (!this.ctx || !this.soundEnabled) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(idx === 3 ? 0.28 : 0.16, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (idx === 3 ? 0.55 : 0.2));
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start();
            osc.stop(this.ctx.currentTime + (idx === 3 ? 0.55 : 0.2));
          }, idx * 110);
        });
        break;
      }
      case 'gather': {
        // Brief high click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(550, now);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        osc.start();
        osc.stop(now + 0.04);
        break;
      }
      case 'refine_success': {
        // Sparkling high metallics
        [880, 1320, 1760].forEach((freq, idx) => {
          setTimeout(() => {
            if (!this.ctx || !this.soundEnabled) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.45);
          }, idx * 60);
        });
        break;
      }
      case 'refine_break': {
        // Deep lowpass explosion decay
        const duration = 0.55;
        try {
          const bufferSize = this.ctx.sampleRate * duration;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noiseNode = this.ctx.createBufferSource();
          noiseNode.buffer = buffer;
          
          const gainNode = this.ctx.createGain();
          gainNode.gain.setValueAtTime(0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + duration);
          
          noiseNode.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(this.sfxVolume);
          
          noiseNode.start();
        } catch (e) {
          // Fallback simple bass drop
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(this.sfxVolume);
          osc.start();
          osc.stop(now + 0.4);
        }
        break;
      }
    }
  }

  playBGM(theme) {
    this.init();
    if (!this.ctx) return;
    
    this.currentTheme = theme;
    if (!this.musicEnabled) return;
    
    // Resume context if suspended (browser security)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    // Stop any currently running sequencer
    this.stopBGM();
    
    // Set tempo step duration in ms based on theme
    let stepDuration = 200;
    if (theme === 'desert' || theme === 'epic') stepDuration = 150;
    if (theme === 'mystical' || theme === 'creepy') stepDuration = 260;
    if (theme === 'volcanic') stepDuration = 140; // Fast and aggressive
    if (theme === 'dragon_peak') stepDuration = 220; // Majestic and sweeping
    
    this.step = 0;
    
    this.sequencerInterval = setInterval(() => {
      if (!this.musicEnabled) {
        this.stopBGM();
        return;
      }
      this.tickSequencer(theme);
    }, stepDuration);
  }

  stopBGM() {
    if (this.sequencerInterval) {
      clearInterval(this.sequencerInterval);
      this.sequencerInterval = null;
    }
  }

  tickSequencer(theme) {
    this.step = (this.step + 1) % 16;
    
    if (theme === 'cheerful') {
      // C - Am - G - F chord progression
      const chords = [
        { bass: NOTES.C3, lead: [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5] },
        { bass: NOTES.A3, lead: [NOTES.A4, NOTES.C5, NOTES.E5, NOTES.A5] },
        { bass: NOTES.G3, lead: [NOTES.G4, NOTES.B4, NOTES.D5, NOTES.G5] },
        { bass: NOTES.F3, lead: [NOTES.F4, NOTES.A4, NOTES.C5, NOTES.F5] }
      ];
      const chordIndex = Math.floor(this.step / 4);
      const noteIndex = this.step % 4;
      const currentChord = chords[chordIndex];
      
      if (this.step % 2 === 0) {
        this.playSynthNote(currentChord.bass, 'triangle', 0.45, 0.08);
      }
      this.playSynthNote(currentChord.lead[noteIndex], 'square', 0.15, 0.035);
    } 
    else if (theme === 'mystical') {
      // Am - Em - F - Dm (slow, atmospheric)
      const chords = [
        { bass: NOTES.A3, lead: [NOTES.A4, NOTES.C5, NOTES.E5, NOTES.A5] },
        { bass: NOTES.E3, lead: [NOTES.G4, NOTES.B4, NOTES.E5, NOTES.G5] },
        { bass: NOTES.F3, lead: [NOTES.A4, NOTES.C5, NOTES.F5, NOTES.A5] },
        { bass: NOTES.D3, lead: [NOTES.F4, NOTES.A4, NOTES.D5, NOTES.F5] }
      ];
      const chordIndex = Math.floor(this.step / 4);
      const noteIndex = this.step % 4;
      const currentChord = chords[chordIndex];
      
      if (this.step % 4 === 0) {
        this.playSynthNote(currentChord.bass, 'triangle', 0.9, 0.07);
      }
      if (this.step % 2 === 0) {
        this.playSynthNote(currentChord.lead[noteIndex], 'sine', 0.35, 0.045);
      }
    }
    else if (theme === 'desert') {
      // Exotic scale steps
      const bassSeq = [NOTES.E3, NOTES.E3, NOTES.F3, NOTES.F3, NOTES.G3, NOTES.G3, NOTES.F3, NOTES.F3];
      const leadSeq = [NOTES.E4, NOTES.F4, NOTES.G4, NOTES.A4, NOTES.B4, NOTES.C5, NOTES.B4, NOTES.A4];
      
      const bassNote = bassSeq[Math.floor(this.step / 2) % bassSeq.length];
      const leadNote = leadSeq[this.step % leadSeq.length];
      
      if (this.step % 2 === 0) {
        this.playSynthNote(bassNote, 'triangle', 0.3, 0.085);
      }
      this.playSynthNote(leadNote, 'sawtooth', 0.12, 0.022);
    }
    else if (theme === 'epic') {
      // Fast, driving C - G - Am - F
      const bassSeq = [NOTES.C3, NOTES.C3, NOTES.G3, NOTES.G3, NOTES.A3, NOTES.A3, NOTES.F3, NOTES.F3];
      const leadSeq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.G5, NOTES.B5, NOTES.D6, NOTES.G5];
      
      const bassNote = bassSeq[Math.floor(this.step / 2) % bassSeq.length];
      const leadNote = leadSeq[this.step % leadSeq.length];
      
      if (this.step % 2 === 0) {
        this.playSynthNote(bassNote, 'triangle', 0.28, 0.09);
      }
      this.playSynthNote(leadNote, 'square', 0.1, 0.038);
    }
    else if (theme === 'creepy') {
      // Dissonant intervals
      const bassSeq = [NOTES.A3, NOTES.A3, NOTES.Ash3, NOTES.Ash3, NOTES.C4, NOTES.C4, NOTES.Csh4, NOTES.Csh4];
      const leadSeq = [NOTES.A4, NOTES.Dsh5, NOTES.E5, NOTES.A4, NOTES.C5, NOTES.Fsh5, NOTES.G5, NOTES.Dsh5];
      
      const bassNote = bassSeq[Math.floor(this.step / 2) % bassSeq.length];
      const leadNote = leadSeq[this.step % leadSeq.length];
      
      if (this.step % 4 === 0) {
        this.playSynthNote(bassNote, 'triangle', 0.95, 0.075);
      }
      if (this.step % 2 === 0) {
        this.playSynthNote(leadNote, 'sawtooth', 0.24, 0.022);
      }
    }
    else if (theme === 'volcanic') {
      // Phrygian minor — E Phrygian (intense, fiery, urgent)
      // Bass: E2 - F2 - G2 - F2 | Lead: rapid angry scale runs
      const bassSeq = [NOTES.E3, NOTES.E3, NOTES.F3, NOTES.G3, NOTES.F3, NOTES.E3, NOTES.Dsh3, NOTES.E3];
      const leadSeq = [
        NOTES.E5, NOTES.F5, NOTES.G5, NOTES.Ash5,
        NOTES.G5, NOTES.F5, NOTES.E5, NOTES.Dsh5,
        NOTES.E5, NOTES.G5, NOTES.Ash5, NOTES.C6,
        NOTES.Ash5, NOTES.G5, NOTES.F5, NOTES.E5
      ];
      const bassNote = bassSeq[Math.floor(this.step / 2) % bassSeq.length];
      const leadNote = leadSeq[this.step % leadSeq.length];
      if (this.step % 2 === 0) {
        this.playSynthNote(bassNote, 'sawtooth', 0.35, 0.10);
      }
      this.playSynthNote(leadNote, 'sawtooth', 0.13, 0.025);
      // Percussion accent — low pulse every 4 steps
      if (this.step % 4 === 0) {
        this.playSynthNote(NOTES.E2 || 82.4, 'triangle', 0.5, 0.12);
      }
    }
    else if (theme === 'dragon_peak') {
      // Heroic soaring theme — Eb major (majestic, wind-swept)
      // Chord progression: Eb - Bb - Ab - Cm
      const chords = [
        { bass: NOTES.Dsh3, lead: [NOTES.Dsh5, NOTES.G5, NOTES.Ash5, NOTES.Dsh6] },
        { bass: NOTES.Ash3, lead: [NOTES.Ash4, NOTES.D5, NOTES.F5, NOTES.Ash5] },
        { bass: NOTES.Gsh3, lead: [NOTES.Gsh4, NOTES.C5, NOTES.Dsh5, NOTES.Gsh5] },
        { bass: NOTES.C3, lead: [NOTES.C5, NOTES.Dsh5, NOTES.G5, NOTES.C6] }
      ];
      const chordIndex = Math.floor(this.step / 4);
      const noteIndex = this.step % 4;
      const currentChord = chords[chordIndex % chords.length];
      // Choir-pad (slow attack sine)
      if (this.step % 4 === 0) {
        this.playSynthNote(currentChord.bass, 'triangle', 1.1, 0.09);
      }
      if (this.step % 2 === 0) {
        this.playSynthNote(currentChord.lead[noteIndex % 4], 'sine', 0.4, 0.05);
      }
      // High lead melody
      if (this.step % 4 === 2) {
        this.playSynthNote(currentChord.lead[2], 'square', 0.1, 0.03);
      }
    }
  }

  // === Dragon SFX ===

  /** Dragon Roar: pitch-sliding sawtooth + noise decay */
  playDragonRoar() {
    this.init();
    if (!this.ctx || !this.soundEnabled) return;
    const now = this.ctx.currentTime;
    // Sawtooth pitch slide down
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 1.5);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2.0);
    // Noise burst via white noise buffer
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
  }

  /** Fire Breath: band-passed noise sweep for searing heat effect */
  playFireBreath() {
    this.init();
    if (!this.ctx || !this.soundEnabled) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(3000, now + 0.4);
    filter.frequency.linearRampToValueAtTime(400, now + 1.2);
    filter.Q.value = 1.5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }
}

export const audioSystem = new AudioSystem();
