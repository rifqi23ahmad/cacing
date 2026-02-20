import { Particle } from './Particle';
import { random } from '../utils';
import { CONSTANTS } from '../constants';

// ──────────────────────────────────────────────────────────────
// Rock — mineable obstacle. Breaks when HP hits 0, respawns.
// ──────────────────────────────────────────────────────────────
export class Rock {
    constructor(x, y, tier = 'medium') {
        this.x = x;
        this.y = y;
        this.tier = tier;
        this.baseRadius = tier === 'large' ? 35 : (tier === 'medium' ? 22 : 13);
        this.radius = this.baseRadius;
        this.maxHp = tier === 'large' ? 60 : (tier === 'medium' ? 30 : 15);
        this.hp = this.maxHp;
        this.alive = true;
        this.respawnAt = null;

        // Ore type: large rocks have black ore, smaller have green ore
        this.oreType = tier === 'large' ? 'black' : 'green';

        // Visual — tinted by ore type
        if (tier === 'large') this.color = '#3E2723';   // dark (black ore inside)
        else if (tier === 'medium') this.color = '#4E6B3A'; // greenish tint
        else this.color = '#6A8A4C';                        // lighter green

        this.cracks = [];
        this.shake = 0;
        this.shapeOffsets = Array.from({ length: 12 }, () => random(-this.radius * 0.12, this.radius * 0.12));
    }

    // Called by Aha when he swings at this rock
    // Returns { ore: number, oreType: 'green'|'black' } on break, else {ore:0}
    takeDamage(dmg, particles) {
        if (!this.alive) return { ore: 0, oreType: this.oreType };
        this.hp -= dmg;
        this.markCrack();
        this.shake = 6;

        // Spark particles on hit
        const sparkColor = this.oreType === 'black' ? '#FF8F00' : '#A5D6A7';
        if (particles) {
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(this.x, this.y, sparkColor, {
                    size: random(1.5, 3.5),
                    vx: random(-4, 4),
                    vy: random(-4, 1),
                    life: random(0.4, 0.8),
                    decay: 0.05,
                    gravity: 0.1,
                }));
            }
        }

        if (this.hp <= 0) {
            this.alive = false;
            this.respawnAt = Date.now() + CONSTANTS.ROCK_RESPAWN_TIME;

            // Define multi-drop rewards
            let drops = [];
            if (this.tier === 'large') {
                drops = [
                    { type: 'black' }, { type: 'black' }, { type: 'black' },
                    { type: 'green' }, { type: 'green' }
                ];
            } else if (this.tier === 'medium') {
                drops = [{ type: 'green' }, { type: 'green' }, { type: 'green' }];
            } else {
                drops = [{ type: 'green' }];
            }

            // Big burst particles on death
            if (particles) {
                for (let i = 0; i < 14; i++) {
                    particles.push(new Particle(this.x, this.y, sparkColor, {
                        size: random(3, 7),
                        vx: random(-5, 5),
                        vy: random(-5, 2),
                        life: random(0.6, 1.4),
                        decay: 0.025,
                        gravity: 0.12,
                    }));
                }
                // Also a few rock-chunk particles
                for (let i = 0; i < 6; i++) {
                    particles.push(new Particle(this.x, this.y, this.color, {
                        size: random(4, 9),
                        vx: random(-3, 3),
                        vy: random(-4, 1),
                        life: random(0.5, 1.2),
                        decay: 0.03,
                        gravity: 0.15,
                    }));
                }
            }
            return { drops };
        }
        return { drops: [] };
    }

    markCrack() {
        if (this.cracks.length < 8) {
            this.cracks.push({ angle: random(0, Math.PI * 2), len: random(0.3, 0.9) });
        }
    }

    // Check if it's time to come back
    checkRespawn() {
        if (!this.alive && this.respawnAt && Date.now() >= this.respawnAt) {
            this.hp = this.maxHp;
            this.alive = true;
            this.cracks = [];
            this.respawnAt = null;
            this.shake = 3;
        }
    }

    draw(ctx) {
        if (!ctx) return;

        // Ghost (respawning) rendering
        if (!this.alive) {
            if (!this.respawnAt) return;
            const remaining = this.respawnAt - Date.now();
            const progress = 1 - remaining / CONSTANTS.ROCK_RESPAWN_TIME;
            ctx.globalAlpha = progress * 0.3;
        }

        const drawX = this.x + (Math.random() - 0.5) * this.shake;
        const drawY = this.y + (Math.random() - 0.5) * this.shake;
        if (this.shake > 0) this.shake *= 0.8;

        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;

        ctx.beginPath();
        const segs = this.shapeOffsets.length;
        for (let i = 0; i <= segs; i++) {
            const theta = (i / segs) * Math.PI * 2;
            const r = this.radius + this.shapeOffsets[i % segs];
            const px = drawX + Math.cos(theta) * r;
            const py = drawY + Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cracks
        if (this.alive) {
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            this.cracks.forEach(c => {
                const sx = drawX + Math.cos(c.angle) * this.radius * 0.2;
                const sy = drawY + Math.sin(c.angle) * this.radius * 0.2;
                const ex = drawX + Math.cos(c.angle) * this.radius * c.len;
                const ey = drawY + Math.sin(c.angle) * this.radius * c.len;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            });

            // HP bar
            if (this.hp < this.maxHp) {
                const bw = 36, bh = 4;
                ctx.fillStyle = '#b71c1c';
                ctx.fillRect(drawX - bw / 2, drawY - this.radius - 10, bw, bh);
                ctx.fillStyle = '#ff8f00';
                ctx.fillRect(drawX - bw / 2, drawY - this.radius - 10, bw * (this.hp / this.maxHp), bh);
            }
        }

        ctx.globalAlpha = 1;
    }
}
