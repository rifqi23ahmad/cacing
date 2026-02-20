import { CONSTANTS, WORLD, COLORS } from '../constants';
import { random, dist } from '../utils';

// ── Food particle ────────────────────────────────────────────
export class FoodParticle {
    constructor(x, y, layer = 'mid') {
        this.x = x;
        this.y = y;
        this.layer = layer;
        this.alive = true;
        this.radius = random(4, 8);
        this.nutrition = this.radius * 10;
        // Color depends on layer
        this.color = layer === 'top' ? '#AED581' : (layer === 'mid' ? '#66BB6A' : '#827717');
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ── Water droplet ────────────────────────────────────────────
export class WaterDroplet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.alive = true;
        this.radius = random(3, 5);
        this.baseColor = COLORS?.water || '#4FC3F7';
        this.born = Date.now();
    }

    draw(ctx) {
        if (!this.alive) return;
        const bounce = Math.sin((Date.now() - this.born) / 200) * 1.5;
        ctx.save();
        ctx.fillStyle = this.baseColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bounce, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(this.x - 1.2, this.y - 1.2 + bounce, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ── Mushroom ─────────────────────────────────────────────────
export class Mushroom {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = random(4, 10);
        this.maxSize = this.size + random(10, 20);
        this.alive = true;
        this.spreadTimer = 0;
        this.color = COLORS.mushroom;
        this.nutrition = 15;
    }

    update() {
        if (!this.alive) return;
        // Grow slowly
        if (this.size < this.maxSize) this.size += 0.01;
        this.spreadTimer++;
    }

    shouldSpread() {
        return this.size > this.maxSize * 0.7 && this.spreadTimer > 600 && Math.random() < CONSTANTS.MUSHROOM_SPREAD_RATE;
    }

    resetSpread() {
        this.spreadTimer = 0;
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Stem
        ctx.fillStyle = '#D7CCC8';
        ctx.fillRect(-this.size * 0.2, 0, this.size * 0.4, this.size * 0.8);

        // Cap
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        // Spots
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(-this.size * 0.2, -this.size * 0.3, this.size * 0.15, 0, Math.PI * 2);
        ctx.arc(this.size * 0.25, -this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ── Root (obstacle/path) ─────────────────────────────────────
export class Root {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const len = randInt(40, 120);
        const angle = random(Math.PI * 0.5, Math.PI * 1.5); // mostly downward
        this.endX = x + Math.cos(angle) * len;
        this.endY = y + Math.sin(angle) * len;
        this.width = random(2, 5);
        this.alive = true;
        this.isPath = Math.random() < 0.4; // 40% are traversable paths
    }

    // Simple line-circle intersection check
    blocksPath(wx, wy, radius = 8) {
        if (this.isPath) return false;
        const dx = this.endX - this.x;
        const dy = this.endY - this.y;
        const len2 = dx * dx + dy * dy;
        let t = ((wx - this.x) * dx + (wy - this.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const cx = this.x + t * dx;
        const cy = this.y + t * dy;
        return dist(wx, wy, cx, cy) < radius + this.width;
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.endX, this.endY);
        ctx.strokeStyle = this.isPath ? '#8D6E63' : '#5D4037';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
}

function randInt(a, b) { return Math.floor(random(a, b + 1)); }
