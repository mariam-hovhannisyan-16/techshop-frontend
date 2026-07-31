import { Injectable } from '@angular/core';

const SOUND_ENABLED_KEY = 'sound_effects_enabled';
const ADD_TO_CART_SOUND_URL = '/sounds/add-to-cart.mp3';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioContext: AudioContext | null = null;
  private addToCartAudio: HTMLAudioElement | null = null;
  private enabled: boolean;

  constructor() {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    this.enabled = stored === null ? true : stored === 'true';
  }

  playAddToCart(): void {
    if (!this.enabled) return;
    if (typeof Audio === 'undefined') return;

    if (!this.addToCartAudio) {
      this.addToCartAudio = new Audio(ADD_TO_CART_SOUND_URL);
      this.addToCartAudio.volume = 0.5;
    }

    this.addToCartAudio.currentTime = 0;

    try {
      this.addToCartAudio.play()?.catch(() => {});
    } catch {
    }
  }

  playNotification(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.playTone(ctx, 988, ctx.currentTime, 0.35, 0.08, 'sine');
    this.playTone(ctx, 1480, ctx.currentTime, 0.3, 0.03, 'sine');
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof AudioContext === 'undefined') return null;

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {

      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    peakGain: number,
    type: OscillatorType
  ): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }
}
