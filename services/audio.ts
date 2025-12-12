
// A simple Web Audio API synthesizer for retro game sounds

class AudioController {
  private ctx: AudioContext | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  
  // Retro Melody: C Major Arpeggio style
  private melody = [
    261.63, 329.63, 392.00, 523.25, // C E G C
    392.00, 329.63, // G E
    293.66, 349.23, 440.00, 587.33, // D F A D
    440.00, 349.23  // A F
  ];
  private currentNoteIndex = 0;
  private nextNoteTime = 0;
  private tempo = 0.4; // Seconds per note

  constructor() {
    // We defer initialization until user interaction
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
        if (this.isMuted) {
            this.stopBGM();
        } else {
            this.playBGM();
        }
    }
    return this.isMuted;
  }

  playBGM() {
    if (this.isMuted || this.isPlaying || !this.ctx) return;
    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduleNote();
  }

  stopBGM() {
    this.isPlaying = false;
    if (this.bgmGain) {
        this.bgmGain.disconnect();
        this.bgmGain = null;
    }
    this.bgmOscillators.forEach(osc => {
        try { osc.stop(); } catch(e){}
    });
    this.bgmOscillators = [];
  }

  private scheduleNote() {
    if (!this.isPlaying || !this.ctx) return;

    // Lookahead
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.playTone(this.melody[this.currentNoteIndex], this.nextNoteTime, 0.3);
        this.nextNoteTime += this.tempo;
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
    }
    
    requestAnimationFrame(() => this.scheduleNote());
  }

  private playTone(freq: number, time: number, duration: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square'; // Retro sound
      osc.frequency.value = freq;
      
      // Filter for softer sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      gain.gain.setValueAtTime(0.03, time); // Low volume background
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.start(time);
      osc.stop(time + duration);
      
      // Cleanup for memory, though technically not tracking strictly here for BGM loop chunks
  }

  // --- SFX ---

  playSFX(type: 'step' | 'chat' | 'join' | 'success' | 'warp') {
      if (this.isMuted || !this.ctx) return;
      
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'step') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, t);
          osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.start(t);
          osc.stop(t + 0.05);
      } else if (type === 'chat') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, t);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.start(t);
          osc.stop(t + 0.1);
      } else if (type === 'join') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(600, t + 0.2);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
      } else if (type === 'success') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, t); // A4
          osc.frequency.setValueAtTime(554, t + 0.1); // C#5
          osc.frequency.setValueAtTime(659, t + 0.2); // E5
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.4);
          osc.start(t);
          osc.stop(t + 0.4);
      } else if (type === 'warp') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.3);
          osc.start(t);
          osc.stop(t + 0.3);
      }
  }
}

export const audioService = new AudioController();
