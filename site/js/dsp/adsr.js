// ============================================================
// Sound Basics · dsp/adsr.js
// Port of cpp/src/ADSR.cpp: linear attack / decay / sustain / release.
// ============================================================

export const AdsrState = Object.freeze({ Idle: 0, Attack: 1, Decay: 2, Sustain: 3, Release: 4 });

export class ADSR {
  constructor() {
    this.currentState = AdsrState.Idle;
    this.sampleRate = 44100;
    this.attackTime = 0.01;
    this.decayTime = 0.1;
    this.sustainLevel = 1.0;
    this.releaseTime = 0.1;
    this.currentLevel = 0;
    this.calculateRates();
  }

  setSampleRate(rate) {
    this.sampleRate = rate;
    this.calculateRates();
  }

  setParameters(attack, decay, sustain, release) {
    this.attackTime = attack;
    this.decayTime = decay;
    this.sustainLevel = sustain;
    this.releaseTime = release;
    this.calculateRates();
  }

  calculateRates() {
    this.attackRate = this.attackTime > 0 ? 1 / (this.attackTime * this.sampleRate) : 1;
    // decay = 0 jumps straight to sustain (it used to be 0 and got stuck at full level)
    this.decayRate = this.decayTime > 0 ? (1 - this.sustainLevel) / (this.decayTime * this.sampleRate) : 1;
    this.releaseRate = this.releaseTime > 0 ? this.sustainLevel / (this.releaseTime * this.sampleRate) : 1;
  }

  noteOn() {
    // Start from the current level, so re-triggering doesn't click.
    this.currentState = AdsrState.Attack;
  }

  noteOff() {
    if (this.currentState !== AdsrState.Idle) {
      this.currentState = AdsrState.Release;
      this.releaseRate = this.releaseTime > 0 ? this.currentLevel / (this.releaseTime * this.sampleRate) : 1;
    }
  }

  process() {
    switch (this.currentState) {
      case AdsrState.Idle:
        this.currentLevel = 0;
        break;
      case AdsrState.Attack:
        this.currentLevel += this.attackRate;
        if (this.currentLevel >= 1) {
          this.currentLevel = 1;
          this.currentState = AdsrState.Decay;
        }
        break;
      case AdsrState.Decay:
        this.currentLevel -= this.decayRate;
        if (this.currentLevel <= this.sustainLevel) {
          this.currentLevel = this.sustainLevel;
          this.currentState = AdsrState.Sustain;
        }
        break;
      case AdsrState.Sustain:
        break;
      case AdsrState.Release:
        this.currentLevel -= this.releaseRate;
        if (this.currentLevel <= 0) {
          this.currentLevel = 0;
          this.currentState = AdsrState.Idle;
        }
        break;
    }
    return this.currentLevel;
  }

  isActive() { return this.currentState !== AdsrState.Idle; }
}
