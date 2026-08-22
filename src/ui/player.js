/**
 * Subtitle Master - Live Video Player Simulator Engine
 * Provides realistic synchronized playback, timecode scrubbing, and live subtitle rendering.
 */

import { formatSecondsToVtt } from '../utils/time.js';

export class SubtitlePlayer {
  constructor(options = {}) {
    this.cues = [];
    this.currentTime = 0;
    this.duration = 10;
    this.isPlaying = false;
    this.playbackRate = 1.0;
    this.animationFrameId = null;
    this.lastTimestamp = null;
    this.onTimeUpdate = options.onTimeUpdate || null;
    this.onCueChange = options.onCueChange || null;
    this.currentCue = null;
  }

  loadCues(cues) {
    this.cues = Array.isArray(cues) ? [...cues].sort((a, b) => a.start - b.start) : [];
    if (this.cues.length > 0) {
      this.duration = Math.max(10, this.cues[this.cues.length - 1].end + 2);
    } else {
      this.duration = 10;
    }
    this.seek(0);
  }

  play() {
    if (this.isPlaying) return;
    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
    }
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTimestamp = null;
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  seek(seconds) {
    this.currentTime = Math.max(0, Math.min(seconds, this.duration));
    this.updateActiveCue();
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime, this.duration);
    }
  }

  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.25, Math.min(rate, 4.0));
  }

  tick() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dt = (now - (this.lastTimestamp || now)) / 1000;
    this.lastTimestamp = now;

    this.currentTime += dt * this.playbackRate;

    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.pause();
      this.updateActiveCue();
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTime, this.duration);
      }
      return;
    }

    this.updateActiveCue();
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime, this.duration);
    }

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  updateActiveCue() {
    const active = this.cues.find(c => this.currentTime >= c.start && this.currentTime <= c.end) || null;
    if (active !== this.currentCue) {
      this.currentCue = active;
      if (this.onCueChange) {
        this.onCueChange(active);
      }
    }
  }
}
