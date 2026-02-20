import { CONSTANTS } from '../constants';
import { random } from '../utils';

export class Particle {
    constructor(x, y, color, options = {}) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = options.vx || random(-1, 1);
        this.vy = options.vy || random(-1, 1);
        this.life = options.life || 1.0;
        this.decay = options.decay || 0.02;
        this.size = options.size || random(2, 5);
        this.friction = options.friction || 0.98;
        this.gravity = options.gravity || 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
