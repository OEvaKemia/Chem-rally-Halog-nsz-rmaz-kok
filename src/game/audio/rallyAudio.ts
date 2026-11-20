/**
 * Procedural Web Audio API rally engine & gravel sound synthesizer.
 * Zero external audio file dependencies.
 */
export class RallyAudio {
  private ctx: AudioContext | null = null;
  private oscPrimary: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private gravelGain: GainNode | null = null;
  private gravelFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private initialized = false;

  public start(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.18;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Engine harmonic oscillators
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 260;

      const engineGain = ctx.createGain();
      engineGain.gain.value = 0.25;

      const oscPrimary = ctx.createOscillator();
      oscPrimary.type = 'sawtooth';
      oscPrimary.frequency.value = 54;

      const oscSub = ctx.createOscillator();
      oscSub.type = 'triangle';
      oscSub.frequency.value = 27;

      oscPrimary.connect(engineFilter);
      oscSub.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);

      oscPrimary.start();
      oscSub.start();

      this.oscPrimary = oscPrimary;
      this.oscSub = oscSub;
      this.engineGain = engineGain;

      // Gravel tire noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const gravelFilter = ctx.createBiquadFilter();
      gravelFilter.type = 'bandpass';
      gravelFilter.frequency.value = 950;
      gravelFilter.Q.value = 0.8;

      const gravelGain = ctx.createGain();
      gravelGain.gain.value = 0;

      noiseSrc.connect(gravelFilter);
      gravelFilter.connect(gravelGain);
      gravelGain.connect(master);
      noiseSrc.start();

      this.gravelFilter = gravelFilter;
      this.gravelGain = gravelGain;
      this.initialized = true;
    } catch {
      // Audio unavailable in restricted environments
    }
  }

  public update(speedAbs: number, throttle: number, isOffRoad: boolean, isDrifting: boolean, active: boolean): void {
    if (!this.initialized || !this.ctx || !this.oscPrimary || !this.oscSub || !this.engineGain || !this.gravelGain || !this.gravelFilter) {
      return;
    }

    const now = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0.03, now, 0.1);
      this.gravelGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    // Simulate 5-gear rally RPM cadence
    const gearBand = Math.min(4, Math.floor(speedAbs / 7.5));
    const localNorm = (speedAbs - gearBand * 6.5) / 10;
    const baseFreq = 46 + Math.max(0, Math.min(1.4, localNorm)) * 58 + throttle * 16;

    this.oscPrimary.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.18 + throttle * 0.18, now, 0.06);

    const surfaceNoise = Math.min(1, speedAbs / 28) * (isOffRoad ? 0.24 : isDrifting ? 0.22 : 0.08);
    this.gravelGain.gain.setTargetAtTime(surfaceNoise, now, 0.06);
    this.gravelFilter.frequency.setTargetAtTime(isOffRoad ? 620 : 1150, now, 0.08);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.18, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
