import { random } from '../utils';

export class Plant {
    constructor(x, y, type = 'main') {
        this.x = x;
        this.y = y;
        this.type = type; // 'main' or 'daily'
        this.growthPoints = 0;
        this.maxGrowthPoints = type === 'main' ? 1000 : 200; // Adjust as needed
        this.budRadius = 5;
        this.currentHeight = 20;
        this.tipX = x;
        this.tipY = y - 20;
    }

    update(progress) {
        // progress is 0.0 to 1.0
        const maxHeight = this.type === 'main' ? 300 : 150;
        const baseHeight = 20;
        this.currentHeight = baseHeight + (maxHeight - baseHeight) * progress;
        this.tipX = this.x;
        this.tipY = this.y - this.currentHeight;
        this.budRadius = 5 + progress * 15;
    }

    draw(ctx, progress) {
        const { x, y, currentHeight, tipX, tipY, budRadius } = this;

        // Stem
        const maxStemWidth = 30;
        const baseStemWidth = 4;
        const currentStemWidth = baseStemWidth + (maxStemWidth - baseStemWidth) * progress;

        const stemGradient = ctx.createLinearGradient(x - currentStemWidth, y - currentHeight, x + currentStemWidth, y);
        stemGradient.addColorStop(0, '#558b2f');
        stemGradient.addColorStop(1, '#33691e');

        ctx.save();
        ctx.fillStyle = stemGradient;
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(x - currentStemWidth / 2, y);

        const wave = Math.sin(progress * Math.PI * 4 + performance.now() / 1000) * 20 * progress;
        ctx.bezierCurveTo(x - currentStemWidth / 2 + wave, y - currentHeight * 0.66, x + currentStemWidth / 2 - wave, y - currentHeight * 0.33, tipX, tipY);
        ctx.bezierCurveTo(tipX + currentStemWidth / 2 + wave, y - currentHeight * 0.33, x - currentStemWidth / 2 - wave, y - currentHeight * 0.66, x + currentStemWidth / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Leaves
        const numLeaves = 2 + Math.floor(progress * 12);
        for (let i = 0; i < numLeaves; i++) {
            const leafProgress = i / (numLeaves - 1 || 1);
            const leafY = y - currentHeight * leafProgress * 0.9 - 15;
            const side = (i % 2 === 0) ? -1 : 1;
            const leafLength = 10 + progress * 60;
            const leafWidth = 5 + progress * 30;

            ctx.fillStyle = i % 3 === 0 ? '#81c784' : '#689f38';
            ctx.beginPath();
            const stemX = x + Math.sin(leafY / 50 + progress * Math.PI * 4) * (currentStemWidth / 2 * (1 - leafProgress));
            ctx.moveTo(stemX, leafY);
            ctx.quadraticCurveTo(stemX + (leafLength * 0.8 * side), leafY - leafWidth / 2, stemX + (leafLength * side), leafY);
            ctx.quadraticCurveTo(stemX + (leafLength * 0.3 * side), leafY + leafWidth, stemX, leafY);
            ctx.fill();
        }

        // Bud
        const budColor = `hsl(${100 + progress * 40}, 60%, 70%)`;
        ctx.fillStyle = budColor;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tipX, tipY, budRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glow
        const glow = ctx.createRadialGradient(tipX, tipY, budRadius * 0.5, tipX, tipY, budRadius * 2);
        glow.addColorStop(0, 'rgba(255, 255, 220, 0.6)');
        glow.addColorStop(1, 'rgba(255, 255, 220, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(tipX, tipY, budRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
