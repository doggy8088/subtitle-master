/**
 * Subtitle Master - Confetti Particle Engine & Celebratory Feedback
 */

const CONFETTI_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#3b82f6', '#f43f5e'
];

class ConfettiParticle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * this.canvasWidth;
    this.y = initial ? Math.random() * (this.canvasHeight * 0.6) : -15;
    this.size = Math.random() * 8 + 6;
    this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    this.weight = Math.random() * 0.4 + 0.15;
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.sin(this.angle) * (Math.random() * 3 + 1);
    this.vy = Math.cos(this.angle) * (Math.random() * -3 - 2) - (initial ? 0 : this.weight * 6);
    this.opacity = 1;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 8 - 4;
  }

  update() {
    this.vy += this.weight;
    this.x += this.vx;
    this.y += this.vy;
    this.opacity -= 0.006;
    this.rotation += this.rotationSpeed;
  }

  draw(ctx) {
    if (this.opacity <= 0) return;
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.65);
    ctx.restore();
  }
}

class ConfettiCelebration {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.overlay = null;
  }

  init() {
    this.canvas = document.getElementById('confettiCanvas');
    this.overlay = document.getElementById('successOverlay');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  trigger(title = '🎉 任務完成！ 🎉', message = '您的字幕已華麗變身！<br>準備好用更精彩的內容驚艷世界吧！🚀') {
    if (!this.canvas) this.init();
    if (!this.canvas || !this.ctx) return;

    this.resize();

    // Setup modal text
    const titleEl = document.getElementById('successTitle');
    const msgEl = document.getElementById('successMessage');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('flex');
    }

    // Spawn particles
    this.particles = [];
    const count = Math.min(150, Math.floor(window.innerWidth / 9));
    for (let i = 0; i < count; i++) {
      this.particles.push(new ConfettiParticle(this.canvas.width, this.canvas.height));
    }

    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animate();
  }

  animate() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let activeCount = 0;
    for (const p of this.particles) {
      p.update();
      p.draw(this.ctx);
      if (p.opacity > 0 && p.y < this.canvas.height + 20) {
        activeCount++;
      }
    }

    if (activeCount > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      this.overlay.classList.remove('flex');
    }
  }
}

export const celebration = new ConfettiCelebration();
