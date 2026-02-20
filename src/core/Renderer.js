import { WORLD, ZONES } from '../constants';
import { now } from '../utils';

export class Renderer {
    constructor(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;
    }

    draw() {
        const { ctx, engine } = this;
        const W = WORLD.width, H = WORLD.height;
        ctx.clearRect(0, 0, W, H);

        this.drawLayers(W, H);
        this.drawZones();
        engine.roots.forEach(r => r.draw(ctx));
        engine.mushrooms.forEach(m => m.draw(ctx));
        engine.foods.forEach(f => f.draw(ctx));
        engine.rocks.forEach(r => r.draw(ctx));
        engine.eggs.forEach(e => e.draw(ctx));
        engine.waterDroplets.forEach(d => d.draw(ctx));

        if (engine.tika?.alive) engine.tika.draw(ctx);
        if (engine.aha?.alive) engine.aha.draw(ctx);

        engine.allWorms.filter(w => w.alive && w.role === 'offspring').forEach(w => w.draw(ctx));

        this.drawOres();
        engine.particles.forEach(p => p.draw(ctx));

        if (engine.plant) {
            const progress = (engine.world.plantPoints || 0) / 1000;
            engine.plant.update(progress);
            engine.plant.draw(ctx, progress);
        }

        this.drawRain(W, H);
        this.drawHUD(W, H);
    }

    drawLayers(W, H) {
        const { ctx } = this;
        const T = WORLD.topEnd;
        const M = WORLD.midEnd;
        const t = Date.now();

        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, T);
        skyGrad.addColorStop(0, '#1a110a');
        skyGrad.addColorStop(0.6, '#2d1b0e');
        skyGrad.addColorStop(1, '#3d2d1f');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, T);

        // Sun
        const sunX = W * 0.8, sunY = T * 0.28;
        ctx.save();
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 38);
        sunGlow.addColorStop(0, 'rgba(255,220,50,1)');
        sunGlow.addColorStop(0.5, 'rgba(255,200,30,0.3)');
        sunGlow.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath(); ctx.arc(sunX, sunY, 38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFE066';
        ctx.beginPath(); ctx.arc(sunX, sunY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Town/Ground
        const townGrad = ctx.createLinearGradient(0, T, 0, M);
        townGrad.addColorStop(0, '#3d2d1f');
        townGrad.addColorStop(0.3, '#4e342e');
        townGrad.addColorStop(0.7, '#2e1c15');
        townGrad.addColorStop(1, '#1a110a');
        ctx.fillStyle = townGrad;
        ctx.fillRect(0, T, W, M - T);

        // Grass
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(0, T, W, 10);
    }

    drawZones() {
        const { ctx, engine } = this;

        // Mine
        const mine = ZONES.mine;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, mine.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Kitchen
        const kit = ZONES.kitchen;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(kit.x, kit.y, kit.radius, 0, Math.PI * 2);
        ctx.fill();

        // Drawing Ores in Kitchen
        this.drawOrePile('#4CAF50', engine.world.kitchenGreenOre, kit.x - 30, kit.y + 15);
        this.drawOrePile('#424242', engine.world.kitchenBlackOre, kit.x + 15, kit.y + 15);

        // Dining table
        const dinX = kit.x + 75, dinY = kit.y + 15;
        ctx.fillStyle = '#1a110a';
        ctx.fillRect(dinX - 25, dinY, 50, 6);

        // Food on table
        for (let i = 0; i < engine.world.kitchenFood; i++) {
            const mx = dinX - 18 + (i % 5) * 9;
            const my = dinY - 2;
            ctx.fillStyle = '#EEEEEE';
            ctx.beginPath(); ctx.ellipse(mx, my, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
        }

        // Golden Balls
        for (let i = 0; i < engine.world.kitchenGoldenBalls; i++) {
            const mx = dinX - 18 + ((i + engine.world.kitchenFood) % 5) * 9;
            const my = dinY - 4;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    drawOrePile(color, count, startX, startY) {
        const { ctx } = this;
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
            const px = startX + (i % 3) * 8;
            const py = startY - Math.floor(i / 3) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawOres() {
        const { ctx, engine } = this;
        engine.ores.forEach(o => {
            ctx.save();
            ctx.fillStyle = o.type === 'black' ? '#424242' : '#4CAF50';
            ctx.beginPath();
            ctx.arc(o.x, o.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    drawRain(W, H) {
        const { ctx, engine } = this;
        if (engine.world.weather !== 'RAINY') return;
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
        engine.rainDrops.forEach(d => {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y + 8);
            ctx.stroke();
        });
    }

    drawHUD(W, H) {
        const { ctx, engine } = this;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 10, 200, 140);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        let y = 30;
        const row = (label, val) => {
            ctx.fillText(`${label}: ${val}`, 20, y);
            y += 15;
        };
        row('Generation', engine.world.generationCount);
        row('Aha Hunger', `${Math.round(engine.aha?.hunger || 0)}%`);
        row('Tika Hunger', `${Math.round(engine.tika?.hunger || 0)}%`);
        row('Ores (Black/Green)', `${engine.aha?.oreBlack || 0}/${engine.aha?.oreGreen || 0}`);
        row('Kitchen (B/G)', `${engine.world.kitchenBlackOre}/${engine.world.kitchenGreenOre}`);
        row('Dapur Food/Gold', `${engine.world.kitchenFood}/${engine.world.kitchenGoldenBalls}`);
    }
}
