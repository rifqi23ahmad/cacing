import { CONSTANTS, COLORS } from '../constants';
import { now } from '../utils';

export class Egg {
    constructor(x, y, genetics, parentRole) {
        this.x = x;
        this.y = y;
        this.genetics = genetics; // inherited from parents
        this.hatchAt = now() + CONSTANTS.EGG_HATCH_TIME;
        this.alive = true;
        this.radius = 6;
        this.wobble = 0;
        this.parentRole = parentRole;
    }

    update() {
        if (!this.alive) return;
        // Wobble near hatch time
        const timeLeft = this.hatchAt - now();
        if (timeLeft < 3000) {
            this.wobble = Math.sin(now() * 0.02) * 2;
        }
    }

    isReadyToHatch() {
        return this.alive && now() >= this.hatchAt;
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x + this.wobble, this.y);

        // Egg body
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 1.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.egg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 180, 100, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Glow near hatch
        const timeLeft = this.hatchAt - now();
        if (timeLeft < 3000) {
            ctx.globalAlpha = 0.3 + 0.3 * Math.sin(now() * 0.01);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = this.genetics.color || '#A5D6A7';
            ctx.fill();
        }

        ctx.restore();
    }
}
