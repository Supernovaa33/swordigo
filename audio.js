/**
 * Procedural Web Audio synthesizer for Swordigo-inspired SFX.
 * Requires no external audio files and works offline/file://.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playTone({ freq = 440, endFreq = null, duration = 0.12, type = 'triangle', volume = 0.16, delay = 0 }) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (endFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
        }

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    sword(combo = 1) {
        const base = combo === 3 ? 520 : combo === 2 ? 430 : 350;
        this.playTone({ freq: base, endFreq: 130, duration: 0.11, type: 'sawtooth', volume: 0.12 });
    }

    jump(isDouble = false) {
        this.playTone({
            freq: isDouble ? 360 : 250,
            endFreq: isDouble ? 680 : 480,
            duration: 0.12,
            type: 'sine',
            volume: 0.14
        });
    }

    hit() {
        this.playTone({ freq: 190, endFreq: 65, duration: 0.1, type: 'square', volume: 0.16 });
    }

    playerHurt() {
        this.playTone({ freq: 240, endFreq: 75, duration: 0.2, type: 'sawtooth', volume: 0.2 });
    }

    magic() {
        this.playTone({ freq: 620, endFreq: 980, duration: 0.14, type: 'sine', volume: 0.14 });
        this.playTone({ freq: 440, endFreq: 720, duration: 0.16, type: 'triangle', volume: 0.1, delay: 0.03 });
    }

    nova() {
        this.playTone({ freq: 280, endFreq: 720, duration: 0.25, type: 'sawtooth', volume: 0.16 });
        this.playTone({ freq: 520, endFreq: 180, duration: 0.3, type: 'triangle', volume: 0.14, delay: 0.05 });
    }

    coin() {
        this.playTone({ freq: 920, endFreq: 1320, duration: 0.08, type: 'sine', volume: 0.12 });
        this.playTone({ freq: 1320, endFreq: 1560, duration: 0.1, type: 'sine', volume: 0.1, delay: 0.06 });
    }

    heal() {
        [523, 659, 784].forEach((f, i) => {
            this.playTone({ freq: f, duration: 0.14, type: 'sine', volume: 0.12, delay: i * 0.07 });
        });
    }

    chest() {
        [440, 554, 659, 880].forEach((f, i) => {
            this.playTone({ freq: f, duration: 0.16, type: 'triangle', volume: 0.14, delay: i * 0.08 });
        });
    }

    levelUp() {
        [523, 659, 784, 1046].forEach((f, i) => {
            this.playTone({ freq: f, duration: 0.2, type: 'triangle', volume: 0.17, delay: i * 0.09 });
        });
    }

    switchOpen() {
        this.playTone({ freq: 480, endFreq: 760, duration: 0.18, type: 'triangle', volume: 0.15 });
    }

    bossRoar() {
        this.playTone({ freq: 140, endFreq: 55, duration: 0.45, type: 'sawtooth', volume: 0.22 });
    }
}

window.Sound = new SoundEngine();
