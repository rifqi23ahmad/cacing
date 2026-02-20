import { CONSTANTS, WORLD, COLORS } from '../constants';
import { dist, angleTo, clamp, random } from '../utils';

export class Predator {
    constructor(type, x, y) {
        this.type = type; // 'bird' | 'underground'
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = 0;
        this.alive = true;
        this.state = 'PATROL';  // PATROL | DIVE | RETREAT
        this.target = null;
        this.speed = CONSTANTS.PREDATOR_SPEED * (type === 'bird' ? 1.5 : 1);
        this.size = type === 'bird' ? 12 : 9;
        this.diveY = null;
        this.patrolY = type === 'bird'
            ? random(10, WORLD.topEnd * 0.5)
            : random(WORLD.midEnd + 20, WORLD.height - 20);
    }

    update(worms, eggs) {
        if (!this.alive) return;

        if (this.type === 'bird') this._updateBird(worms);
        else this._updateUnderground(worms, eggs);

        // Wrap horizontally
        if (this.x < -30) this.x = WORLD.width + 30;
        if (this.x > WORLD.width + 30) this.x = -30;
    }

    _updateBird(worms) {
        // Birds patrol the top layer, dive on surface worms
        const topWorms = worms.filter(w => w.alive && w.getHead().y < WORLD.topEnd);

        if (this.state === 'PATROL') {
            this.x += this.vx;
            this.y += (this.patrolY - this.y) * 0.05;

            const nearWorm = topWorms.find(w => dist(this.x, this.y, w.getHead().x, w.getHead().y) < CONSTANTS.PREDATOR_HUNT_RANGE);
            if (nearWorm) {
                this.target = nearWorm;
                this.state = 'DIVE';
                this.diveY = nearWorm.getHead().y;
            }
        } else if (this.state === 'DIVE') {
            if (!this.target?.alive) { this.state = 'RETREAT'; return; }
            const tx = this.target.getHead().x;
            const ty = this.target.getHead().y;
            const angle = angleTo(this.x, this.y, tx, ty);
            this.x += Math.cos(angle) * (this.speed * 2.5);
            this.y += Math.sin(angle) * (this.speed * 2.5);

            if (dist(this.x, this.y, tx, ty) < 15) {
                this.target.takeDamage(40, 'bird');
                this.state = 'RETREAT';
            }
        } else if (this.state === 'RETREAT') {
            this.y -= 3;
            this.x += this.vx;
            if (this.y < this.patrolY - 20) this.state = 'PATROL';
        }
    }

    _updateUnderground(worms, eggs) {
        // Underground creatures patrol deep, eat worms & eggs there
        const deepTargets = [
            ...worms.filter(w => w.alive && w.getHead().y > WORLD.midEnd),
            ...eggs.filter(e => e.alive && e.y > WORLD.midEnd)
        ];

        if (this.state === 'PATROL') {
            this.x += this.vx;
            this.y += (this.patrolY - this.y) * 0.03;

            const near = deepTargets.find(t => {
                const tx = t.getHead ? t.getHead().x : t.x;
                const ty = t.getHead ? t.getHead().y : t.y;
                return dist(this.x, this.y, tx, ty) < CONSTANTS.PREDATOR_HUNT_RANGE * 0.7;
            });
            if (near) { this.target = near; this.state = 'DIVE'; }
        } else if (this.state === 'DIVE') {
            if (!this.target?.alive) { this.state = 'PATROL'; return; }
            const tx = this.target.getHead ? this.target.getHead().x : this.target.x;
            const ty = this.target.getHead ? this.target.getHead().y : this.target.y;
            const angle = angleTo(this.x, this.y, tx, ty);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;

            if (dist(this.x, this.y, tx, ty) < 12) {
                if (this.target.takeDamage) this.target.takeDamage(30, 'underground');
                else this.target.alive = false; // eat egg
                this.state = 'PATROL';
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const color = this.type === 'bird' ? COLORS.predatorBird : COLORS.predatorDeep;

        if (this.type === 'bird') {
            // Simple bird silhouette
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            ctx.beginPath();
            ctx.moveTo(-this.size, 0);
            ctx.lineTo(-this.size * 2, -this.size * 0.7);
            ctx.lineTo(0, 0);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.size, 0);
            ctx.lineTo(this.size * 2, -this.size * 0.7);
            ctx.lineTo(0, 0);
            ctx.fill();
        } else {
            // Deep creature
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            // Eyes glow
            ctx.fillStyle = '#F44336';
            ctx.beginPath();
            ctx.arc(-4, -2, 2, 0, Math.PI * 2);
            ctx.arc(4, -2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
