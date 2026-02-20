import { CONSTANTS } from '../constants';

export class Collectible {
    constructor(x, y, type, radius = 6, options = {}) {
        this.x = x;
        this.y = y;
        this.type = type; // 'food', 'red_rock', 'start_orb', etc.
        this.radius = radius;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.life = options.life || -1; // -1 means infinite
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.life > 0) this.life -= 0.01;

        // Simple friction/gravity if moving
        if (this.vx !== 0 || this.vy !== 0) {
            this.vx *= 0.95;
            this.vy *= 0.95;
        }
    }

    draw(ctx) {
        let color = '#fff';
        switch (this.type) {
            case 'food': color = '#81c784'; break; // Green Plant Part
            case 'family_food': color = '#4caf50'; break; // Processed Food
            case 'red_rock': color = '#d32f2f'; break; // Red Rock logic
            case 'white_orb': color = '#f5f5f5'; break;
            case 'black_orb': color = '#212121'; break;
            case 'brown_orb': color = '#795548'; break;
            case 'rock_chunk': color = '#8d6e63'; break;
            default: color = '#ffeb3b';
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
