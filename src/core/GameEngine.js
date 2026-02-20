import { CONSTANTS, WORLD, COLORS, ZONES } from '../constants';
import { Worm, createGenetics, mutateGenetics } from '../classes/Worm';
import { Egg } from '../classes/Egg';
import { Predator } from '../classes/Predator';
import { FoodParticle, Mushroom, Root } from '../classes/WorldFeature';
import { Rock } from '../classes/Rock';
import { Plant } from '../classes/Plant';
import { WaterDroplet } from '../classes/WorldFeature';
import { random, choose, now, clamp, dist, mutateColor } from '../utils';

function randInt(a, b) { return Math.floor(random(a, b + 1)); }

// ──────────────────────────────────────────────────────────────
// WorldState – holds all ecosystem state
// ──────────────────────────────────────────────────────────────
class WorldState {
    constructor() {
        this.season = choose(CONSTANTS.SEASONS);
        this.weather = 'CLEAR';
        this.era = 1;
        this.generationCount = 1;
        this.extinctionCount = 0;
        this.totalRuntime = 0;
        this.seasonTimer = now();
        this.eraTimer = now();
        this.goldenWormActive = false;
        this.superEvolution = false;

        // Economy
        this.kitchenGreenOre = 0;  // green ore (medium/small rocks) delivered by Aha
        this.kitchenBlackOre = 0;  // black ore (large rocks) delivered by Aha
        this.kitchenFood = 0;      // cooked meals ready to eat

        // Growth
        this.plantPoints = 0;
        this.dailyPlantPoints = 0;
        this.lastDailyReset = now();
    }
}

// ──────────────────────────────────────────────────────────────
// GameEngine
// ──────────────────────────────────────────────────────────────
export class GameEngine {
    constructor(canvas, updateUICallback) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.updateUI = updateUICallback;

        this.running = false;
        this.startTime = now();

        // Audio
        this.bgm = new Audio(CONSTANTS.BGM_URL);
        this.bgm.loop = true;
        this.bgm.volume = 0.4;

        // World data
        this.world = new WorldState();
        this.aha = null;
        this.tika = null;
        this.eggs = [];
        this.foods = [];
        this.mushrooms = [];
        this.roots = [];
        this.rocks = [];
        this.ores = [];        // dropped ore particles on the ground
        this.predators = [];
        this.particles = [];
        this.allWorms = [];
        this.waterDroplets = [];

        // Rain visuals
        this.rainDrops = [];

        // Plant
        this.plant = null;

        this.setup();
    }

    // ── SETUP ──────────────────────────────────────────────────
    setup() {
        this._resize();
        window.addEventListener('resize', () => this._resize());
        this._generateWorld();
        this._spawnMainCharacters();
        this._spawnPredators();
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        WORLD.width = this.canvas.width;
        WORLD.height = this.canvas.height;
    }

    _generateWorld() {
        this.foods = [];
        this.mushrooms = [];
        this.roots = [];
        // Don't reset rocks fully — just add new ones if mine is empty
        if (this.rocks.length === 0) this.rocks = [];

        const W = WORLD.width, H = WORLD.height;

        // ── Update ZONES positions based on current world size ──
        ZONES.mine.x = W * 0.15;
        ZONES.mine.y = WORLD.topEnd + (WORLD.midEnd - WORLD.topEnd) * 0.4;
        ZONES.kitchen.x = W * 0.65;
        ZONES.kitchen.y = WORLD.topEnd + (WORLD.midEnd - WORLD.topEnd) * 0.5;
        ZONES.market.x = W * 0.88;
        ZONES.market.y = WORLD.topEnd * 0.5;

        // ── Mine rocks (always respawnable proper Rock instances) ──
        if (this.rocks.filter(r => r instanceof Rock).length < 6) {
            const mineRocks = [
                new Rock(ZONES.mine.x - 40, ZONES.mine.y - 20, 'large'),
                new Rock(ZONES.mine.x + 20, ZONES.mine.y + 15, 'medium'),
                new Rock(ZONES.mine.x - 10, ZONES.mine.y + 40, 'medium'),
                new Rock(ZONES.mine.x + 55, ZONES.mine.y - 30, 'small'),
                new Rock(ZONES.mine.x - 60, ZONES.mine.y + 50, 'small'),
                new Rock(ZONES.mine.x + 30, ZONES.mine.y + 55, 'small'),
            ];
            this.rocks = [...this.rocks.filter(r => !(r instanceof Rock)), ...mineRocks];
        }

        // Initial food spread
        for (let i = 0; i < 40; i++) this._spawnFood();

        // Mushrooms in mid/deep
        for (let i = 0; i < 10; i++) {
            this.mushrooms.push(new Mushroom(random(50, W - 50), random(WORLD.topEnd * 1.1, H - 30)));
        }

        // Roots
        for (let i = 0; i < 25; i++) {
            this.roots.push(new Root(random(0, W), random(WORLD.topEnd * 0.5, H)));
        }

        // Initialize Plant (Main and Daily)
        const T = WORLD.topEnd;
        this.plant = new Plant(W / 2, T, 'main');
    }

    _spawnFood() {
        const W = WORLD.width, H = WORLD.height;
        // Weather affects food distribution
        const topWeight = this.world.weather === 'RAINY' ? 3 : 1;
        const midWeight = this.world.weather === 'DROUGHT' ? 0.5 : 2;
        const deepWeight = 0.5;
        const weights = [
            { value: 'top', weight: topWeight },
            { value: 'mid', weight: midWeight },
            { value: 'deep', weight: deepWeight }
        ];
        const total = weights.reduce((s, w) => s + w.weight, 0);
        let r = Math.random() * total;
        let layer = 'mid';
        for (const w of weights) { r -= w.weight; if (r <= 0) { layer = w.value; break; } }

        let y;
        if (layer === 'top') y = random(5, WORLD.topEnd - 5);
        else if (layer === 'mid') y = random(WORLD.topEnd + 5, WORLD.midEnd - 5);
        else y = random(WORLD.midEnd + 5, H - 5);

        this.foods.push(new FoodParticle(random(20, W - 20), y, layer));
    }

    _spawnMainCharacters(parentGenetics = null) {
        const cx = WORLD.width / 2, cy = WORLD.height * 0.5;

        const ahaGen = parentGenetics?.male
            ? mutateGenetics(parentGenetics.male, parentGenetics.male)
            : createGenetics({ color: COLORS.male, speed: 2, size: 11 });
        const tikaGen = parentGenetics?.female
            ? mutateGenetics(parentGenetics.female, parentGenetics.female)
            : createGenetics({ color: COLORS.female, speed: 1.7, size: 10 });

        ahaGen.generation = this.world.generationCount;
        tikaGen.generation = this.world.generationCount;

        this.aha = new Worm('male', cx - 30, cy, ahaGen);
        this.tika = new Worm('female', cx + 30, cy, tikaGen);
        this.aha.setPartner(this.tika);
        this.tika.setPartner(this.aha);

        if (this.world.superEvolution) {
            this.aha.genetics.speed *= 1.5;
            this.tika.genetics.speed *= 1.5;
        }

        this.allWorms = [this.aha, this.tika, ...this.allWorms.filter(w => w.alive && w.role === 'offspring')];
        // Trim offspring to keep performance reasonable
        if (this.allWorms.length > 50) this.allWorms = this.allWorms.slice(-50);

        // Pass world refs
        this._linkWorldToWorms();
    }

    _spawnPredators() {
        const W = WORLD.width, H = WORLD.height;
        // 2-3 birds at top
        const numBirds = randInt(2, 3);
        for (let i = 0; i < numBirds; i++) {
            this.predators.push(new Predator('bird', random(0, W), random(5, WORLD.topEnd * 0.4)));
        }
        // Underground predators removed for realism as per request
    }

    _linkWorldToWorms() {
        const worldRef = {
            foods: this.foods,
            eggs: this.eggs,
            mushrooms: this.mushrooms,
            roots: this.roots,
            rocks: this.rocks,
            ores: this.ores,
            particles: this.particles,
            allWorms: this.allWorms,
            world: this.world,          // gives access to kitchenOre, kitchenFood
            zones: ZONES,
            _onEvent: (type, msg) => this._announceEvent(msg),
        };
        this.allWorms.forEach(w => { w._worldRef = worldRef; });
    }

    // ── MAIN LOOP ──────────────────────────────────────────────
    start() {
        this.running = true;
        this.loop();
    }

    stop() {
        this.running = false;
        this.bgm.pause();
    }

    loop() {
        if (!this.running) return;
        if (this.bgm.paused) this.bgm.play().catch(() => { });
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    // ── UPDATE ─────────────────────────────────────────────────
    update() {
        this.world.totalRuntime = now() - this.startTime;

        // Food spawn
        if (Math.random() < CONSTANTS.FOOD_SPAWN_RATE * (this.world.weather === 'RAINY' ? 3 : 1)) {
            this._spawnFood();
        }

        // Mushroom growth
        this.mushrooms.forEach(m => {
            m.update();
            if (m.shouldSpread()) {
                m.resetSpread();
                this.mushrooms.push(new Mushroom(m.x + random(-80, 80), m.y + random(-30, 30)));
            }
        });
        this.mushrooms = this.mushrooms.filter(m => m.alive).slice(-30); // cap

        // Food cleanup
        this.foods = this.foods.filter(f => f.alive).slice(-150);

        // Water droplets management (for plant)
        if (this.world.weather === 'RAINY' &&
            this.waterDroplets.length < CONSTANTS.WATER_DROPLET_CAP &&
            Math.random() < 0.1) {
            this.waterDroplets.push(new WaterDroplet(random(0, WORLD.width), random(WORLD.topEnd, WORLD.midEnd)));
        }

        // Auto-expire (dry up) droplets after a while
        const nowMs = Date.now();
        this.waterDroplets = this.waterDroplets.filter(d =>
            d.alive && (nowMs - d.born < CONSTANTS.WATER_DROPLET_LIFETIME)
        );

        // Update worms
        const worldRef = {
            foods: this.foods,
            eggs: this.eggs,
            mushrooms: this.mushrooms,
            roots: this.roots,
            rocks: this.rocks,
            ores: this.ores,
            waterDroplets: this.waterDroplets,
            particles: this.particles,
            allWorms: this.allWorms,
            world: this.world,
            zones: ZONES,
            plant: this.plant,
            _onEvent: (type, msg) => this._announceEvent(msg),
        };
        this.allWorms.forEach(w => w.update(worldRef));

        // Rock respawn check
        this.rocks.forEach(r => { if (r instanceof Rock) r.checkRespawn(); });

        // Ore ground items — physics and auto-expire
        this.ores.forEach(o => {
            if (o.vx !== undefined) {
                o.x += o.vx;
                o.y += o.vy;
                o.vy += 0.15; // Gravity
                o.vx *= 0.95; // Friction
                o.vy *= 0.95;
                // Floor bounce
                if (o.y > WORLD.height - 10) {
                    o.y = WORLD.height - 10;
                    o.vy *= -0.5;
                }
            }
        });
        this.ores = this.ores.filter(o => o.alive !== false && (Date.now() - o.born < 30000));

        // Eggs
        this.eggs.forEach(e => e.update());
        const toHatch = this.eggs.filter(e => e.isReadyToHatch());
        toHatch.forEach(e => {
            e.alive = false;
            this.world.generationCount++;
            const offspring = new Worm('offspring',
                e.x + random(-20, 20),
                e.y + random(-20, 20),
                e.genetics
            );
            this.allWorms.push(offspring);
        });
        this.eggs = this.eggs.filter(e => e.alive);

        // Predators
        this.predators.forEach(p => p.update(this.allWorms, this.eggs));

        // Particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // Rain drops
        if (this.world.weather === 'RAINY') {
            if (Math.random() < 0.4) this.rainDrops.push({
                x: random(0, WORLD.width), y: -10,
                vy: random(6, 12), life: 1
            });
            this.rainDrops.forEach(d => { d.y += d.vy; d.life -= 0.015; });
            this.rainDrops = this.rainDrops.filter(d => d.life > 0 && d.y < WORLD.topEnd);
        } else {
            this.rainDrops = [];
        }

        // Dead worm cleanup (keep for "death animation" briefly)
        this.allWorms = this.allWorms.filter(w => w !== this.aha && w !== this.tika ? w.alive : true);

        // ── Evolution events ─────────────────────────────────
        this._checkEvolution();
        this._checkDeathAndRespawn();

        // ── Golden Worm ───────────────────────────────────────
        if (!this.world.goldenWormActive && this.world.totalRuntime > CONSTANTS.GOLDEN_WORM_THRESHOLD) {
            this.world.goldenWormActive = true;
            if (this.aha?.alive) this.aha.isGolden = true;
            if (this.tika?.alive) this.tika.isGolden = true;
        }

        // ── Legend status ─────────────────────────────────────
        if (this.aha?.alive && this.aha.lifetime > 300) this.aha.isLegend = true;
        if (this.tika?.alive && this.tika.lifetime > 300) this.tika.isLegend = true;

        // ── UI update ─────────────────────────────────────────
        this._notifyUI();
    }

    _checkEvolution() {
        // Season shift every 5 min
        if (now() - this.world.seasonTimer > CONSTANTS.SEASON_SHIFT_INTERVAL) {
            this.world.seasonTimer = now();
            this.world.season = choose(CONSTANTS.SEASONS);
            // Weather change
            const rng = Math.random();
            this.world.weather = rng < 0.33 ? 'RAINY' : rng < 0.66 ? 'DRY' : 'CLEAR';
            this.world.era++;
            this._generateWorld(); // Partially refresh terrain
            this._announceEvent(`🌍 Season Shift: ${this.world.season} | Weather: ${this.world.weather} `);
        }

        // Era mutation every 30 min
        if (now() - this.world.eraTimer > CONSTANTS.ERA_MUTATION_INTERVAL) {
            this.world.eraTimer = now();
            // Mutate remaining worms
            this.allWorms.filter(w => w.alive).forEach(w => {
                w.genetics.speed = clamp(w.genetics.speed * (0.9 + Math.random() * 0.3), 0.5, 6);
                w.genetics.size = clamp(w.genetics.size + (Math.random() - 0.5) * 2, 5, 22);
            });
            this._announceEvent('⚡ ERA MUTATION! All living worms evolve.');
        }
    }

    _checkDeathAndRespawn() {
        const ahaDead = !this.aha?.alive;
        const tikaDead = !this.tika?.alive;

        if (ahaDead && tikaDead) {
            // Both dead – check eggs first
            if (this.eggs.length > 0) return; // wait for eggs to hatch
            // Hibernation → evolve new pair
            this.world.extinctionCount++;
            if (this.world.extinctionCount >= 3) {
                this.world.superEvolution = true;
                this._announceEvent('💥 SUPER EVOLUTION MODE ACTIVATED!');
            }
            this._announceEvent(`💀 Extinction #${this.world.extinctionCount}. New generation rises...`);
            this.world.generationCount++;
            this._spawnMainCharacters();
        } else if (ahaDead) {
            // Male died – respawn from egg or mutation
            const egg = this.eggs.find(e => e.alive);
            if (egg) return;
            this.world.generationCount++;
            const newGen = createGenetics({ color: COLORS.male, speed: 2, generation: this.world.generationCount });
            this.aha = new Worm('male', WORLD.width / 2, WORLD.height / 2, newGen);
            this.aha.setPartner(this.tika);
            if (this.tika?.alive) this.tika.setPartner(this.aha);
            this.allWorms.push(this.aha);
            this._announceEvent('🐛 New Aha has emerged from the earth!');
        } else if (tikaDead) {
            // Female died – spawn mutated female
            const egg = this.eggs.find(e => e.alive);
            if (egg) return;
            this.world.generationCount++;
            const newGen = createGenetics({ color: mutateColor(COLORS.female), speed: 1.7, generation: this.world.generationCount });
            this.tika = new Worm('female', WORLD.width / 2 + 40, WORLD.height / 2, newGen);
            this.tika.setPartner(this.aha);
            if (this.aha?.alive) this.aha.setPartner(this.tika);
            this.allWorms.push(this.tika);
            this._announceEvent('🐛 A new Tika has appeared through mutation!');
        }
    }

    _announceEvent(msg) {
        // Store for HUD
        this._lastEvent = { msg, time: now() };
        console.log('[World Event]', msg);
    }

    _notifyUI() {
        if (!this.updateUI) return;

        // Find current rock being mined by Aha for progress bar
        let activeRockProgress = 100;
        if (this.aha && this.aha.state === 'MINING' && this.aha._miningTarget) {
            const r = this.aha._miningTarget;
            activeRockProgress = Math.round((r.hp / r.maxHp) * 100);
        }

        const date = new Date();
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} `;

        // Cooking progress
        let cookProgress = 0;
        if (this.tika && this.tika.state === 'COOKING') {
            cookProgress = Math.round(this.tika.cookProgress * 100);
        }

        this.updateUI({
            ahaStamina: this.aha?.alive ? Math.round(this.aha.hunger) : 0, // Using hunger as stamina proxy for now
            tikaEnergy: this.tika?.alive ? Math.round(this.tika.hunger) : 0,  // Using hunger as energy proxy
            plantProgress: Math.min(100, Math.round((this.world.plantPoints / 1000) * 100)),
            cookingProgress: cookProgress,
            rockProgress: activeRockProgress,
            time: timeStr,
            superEvolution: this.world.superEvolution,
            goldenWorm: this.world.goldenWormActive,
        });
    }

    // ── DRAW ───────────────────────────────────────────────────
    draw() {
        const ctx = this.ctx;
        const W = WORLD.width, H = WORLD.height;
        ctx.clearRect(0, 0, W, H);

        this._drawLayers(ctx, W, H);
        this._drawZones(ctx);
        this._drawRoots(ctx);
        this._drawMushrooms(ctx);
        this._drawFoods(ctx);
        this._drawRocks(ctx);
        this.drawEggs();
        this._drawWaterDroplets(ctx);
        this.drawMainWorms();
        this.drawPredators();
        this.drawOres();
        this.drawParticles();
        this.drawOffspring();
        this._drawPlant(ctx);
        this._drawRain(ctx);
        this._drawHUD(ctx, W, H);
    }

    _drawLayers(ctx, W, H) {
        const T = WORLD.topEnd;    // ~25% y = above-ground line
        const M = WORLD.midEnd;    // ~65% y = ground-to-underground line
        const t = Date.now();

        // ── 1. SKY (0 → T) ────────────────────────────────────────
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

        // Clouds (animated, looping)
        const clouds = [
            { bx: 0.12, by: 0.06, s: 1.1 },
            { bx: 0.38, by: 0.03, s: 0.8 },
            { bx: 0.61, by: 0.08, s: 1.3 },
        ];
        clouds.forEach(c => {
            ctx.save();
            const cx = ((c.bx * W + t * 0.012) % (W + 120)) - 60;
            const cy = c.by * T + Math.sin(t / 4000 + c.bx * 10) * 3;
            ctx.globalAlpha = 0.83;
            const drawCloudPuff = (dx, dy, r) => {
                ctx.beginPath();
                ctx.arc(cx + dx * c.s, cy + dy, r * c.s, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            };
            drawCloudPuff(0, 0, 14); drawCloudPuff(18, 4, 12);
            drawCloudPuff(-18, 4, 11); drawCloudPuff(8, -6, 10); drawCloudPuff(-8, -5, 10);
            ctx.restore();
        });

        // Birds (simple V shapes)
        [0.25, 0.55, 0.72].forEach((bx, i) => {
            const birdX = ((bx * W + t * (0.04 + i * 0.01)) % (W + 80)) - 40;
            const birdY = T * (0.18 + i * 0.09);
            ctx.save();
            ctx.strokeStyle = 'rgba(60,90,120,0.6)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(birdX - 6, birdY); ctx.quadraticCurveTo(birdX, birdY - 4, birdX + 6, birdY);
            ctx.stroke();
            ctx.restore();
        });

        // ── 2. GROUND SURFACE (T → M) ─────────────────────────────
        // Sky-to-ground light gradient
        const townGrad = ctx.createLinearGradient(0, T, 0, M);
        townGrad.addColorStop(0, '#3d2d1f');
        townGrad.addColorStop(0.3, '#4e342e');
        townGrad.addColorStop(0.7, '#2e1c15');
        townGrad.addColorStop(1, '#1a110a');
        ctx.fillStyle = townGrad;
        ctx.fillRect(0, T, W, M - T);

        // Grass strip at surface boundary
        ctx.save();
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(0, T, W, 10);
        // Grass blades
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1.5;
        for (let gx = 0; gx < W; gx += 14) {
            const gy = T + 10;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + 3 * (Math.sin(gx) > 0 ? 1 : -1), gy - 10, gx + 1, gy - 16);
            ctx.stroke();
        }
        ctx.restore();

        // Cobblestone path (horizontal road)
        const pathY = T + (M - T) * 0.55;
        const pathH = 22;
        ctx.save();
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(0, pathY, W, pathH);
        ctx.strokeStyle = '#757575';
        ctx.lineWidth = 1;
        // Cobblestone pattern
        for (let px = 0; px < W; px += 28) {
            for (let py = pathY + 2; py < pathY + pathH - 2; py += 10) {
                ctx.beginPath();
                ctx.roundRect(px + 2, py, 24, 8, 3);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Decorative trees along the path
        const treePosX = [0.15, 0.35, 0.55, 0.75, 0.95];
        treePosX.forEach(tx => {
            const treex = tx * W, treey = pathY - 2;
            ctx.save();
            // Trunk
            ctx.fillStyle = '#1a110a';
            ctx.fillRect(treex - 4, treey - 26, 8, 26);
            // Canopy - darker, more "withered" or "deep forest" look
            const leafGrad = ctx.createRadialGradient(treex, treey - 40, 2, treex, treey - 40, 22);
            leafGrad.addColorStop(0, '#4e342e');
            leafGrad.addColorStop(1, '#1a110a');
            ctx.fillStyle = leafGrad;
            ctx.beginPath(); ctx.arc(treex, treey - 40, 20, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Background buildings (silhouettes at top portion of mid layer)
        const bldgs = [
            { x: 0.05, w: 0.08, h: 0.35, color: '#1a110a' },
            { x: 0.15, w: 0.06, h: 0.45, color: '#2d1b0e' },
            { x: 0.43, w: 0.07, h: 0.38, color: '#1a110a' },
            { x: 0.70, w: 0.05, h: 0.50, color: '#2d1b0e' },
            { x: 0.82, w: 0.09, h: 0.32, color: '#3d2d1f' },
        ];
        bldgs.forEach(b => {
            const bx = b.x * W, bw = b.w * W;
            const topY = T + 14;
            const bh = (M - topY - pathH) * b.h;
            const by = pathY - bh;
            ctx.save();
            ctx.fillStyle = b.color;
            ctx.fillRect(bx, by, bw, bh);
            // Roof (triangle)
            ctx.fillStyle = '#110b06';
            ctx.beginPath();
            ctx.moveTo(bx - 4, by); ctx.lineTo(bx + bw / 2, by - bw * 0.4); ctx.lineTo(bx + bw + 4, by);
            ctx.closePath(); ctx.fill();
            // Windows
            ctx.fillStyle = 'rgba(255,235,100,0.3)';
            const ww = bw * 0.22, wh = ww * 1.3;
            ctx.fillRect(bx + bw * 0.15, by + bh * 0.2, ww, wh);
            ctx.fillRect(bx + bw * 0.55, by + bh * 0.2, ww, wh);
            ctx.restore();
        });

        // ── 3. UNDERGROUND (M → H) ────────────────────────────────
        const deepGrad = ctx.createLinearGradient(0, M, 0, H);
        deepGrad.addColorStop(0, '#1a110a');
        deepGrad.addColorStop(0.4, '#120c07');
        deepGrad.addColorStop(1, '#000000');
        ctx.fillStyle = deepGrad;
        ctx.fillRect(0, M, W, H - M);

        // Realistic soil texture (grains and particles)
        ctx.save();
        for (let i = 0; i < 180; i++) {
            const px = Math.random() * W;
            const py = M + Math.random() * (H - M);
            const size = 0.5 + Math.random() * 1.5;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.03)';
            ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
        }
        // Small organic root veins
        ctx.strokeStyle = 'rgba(45, 27, 14, 0.4)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 15; i++) {
            let rx = Math.random() * W, ry = M + Math.random() * 50;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            for (let j = 0; j < 5; j++) {
                rx += (Math.random() - 0.5) * 20;
                ry += Math.random() * 30;
                ctx.lineTo(rx, ry);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Cave stalactites at the ceiling of underground
        ctx.save();
        ctx.fillStyle = '#1a110a';
        for (let sx = 20; sx < W; sx += 40 + (sx % 30)) {
            const sh = 14 + (sx % 18);
            ctx.beginPath();
            ctx.moveTo(sx - 8, M);
            ctx.lineTo(sx, M + sh);
            ctx.lineTo(sx + 8, M);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Cave crystals (tiny glints)
        ctx.save();
        [0.15, 0.42, 0.67, 0.88].forEach(cx => {
            const crx = cx * W, cry = M + 30 + (cx * 100 % 40);
            ctx.fillStyle = 'rgba(121, 85, 72, 0.4)';
            ctx.beginPath();
            ctx.moveTo(crx, cry - 10); ctx.lineTo(crx - 5, cry + 8); ctx.lineTo(crx + 5, cry + 8);
            ctx.closePath(); ctx.fill();
        });
        ctx.restore();

        // Layer boundary: ground-to-underground thick soil strip
        const soilGrad = ctx.createLinearGradient(0, M - 6, 0, M + 6);
        soilGrad.addColorStop(0, '#2d1b0e');
        soilGrad.addColorStop(1, '#1a110a');
        ctx.fillStyle = soilGrad;
        ctx.fillRect(0, M - 4, W, 10);

        // Dashed layer divider
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 20]);
        ctx.beginPath(); ctx.moveTo(0, T); ctx.lineTo(W, T); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Layer labels
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.font = '10px Inter';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SURFACE', 8, 14);
        ctx.fillText('GROUND', 8, T + 14);
        ctx.fillText('UNDERWORLD', 8, M + 14);
        ctx.restore();

        // Drought overlay
        if (this.world.weather === 'DROUGHT') {
            ctx.fillStyle = 'rgba(100, 50, 0, 0.15)';
            ctx.fillRect(0, 0, W, H);
        }
    }

    _drawPlant(ctx) {
        if (this.plant) {
            const progress = clamp(this.world.plantPoints / 1000, 0, 1);
            this.plant.update(progress);
            this.plant.draw(ctx, progress);
        }
    }

    _drawZones(ctx) {
        const t = Date.now();

        // ── MINE ZONE ──────────────────────────────────────────
        const mine = ZONES.mine;
        ctx.save();
        const mineGrad = ctx.createRadialGradient(mine.x, mine.y, 10, mine.x, mine.y, mine.radius);
        mineGrad.addColorStop(0, 'rgba(26,17,10,0.6)');
        mineGrad.addColorStop(1, 'rgba(26,17,10,0)');
        ctx.fillStyle = mineGrad;
        ctx.beginPath(); ctx.arc(mine.x, mine.y, mine.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Shaft entrance arch - organic/rough edges
        ctx.fillStyle = '#0a0603';
        ctx.beginPath();
        const startX = mine.x - 22, startY = mine.y + 30;
        ctx.moveTo(startX, startY);
        // Rough arch top
        for (let a = Math.PI; a <= Math.PI * 2; a += 0.2) {
            const rx = mine.x + Math.cos(a) * (22 + Math.random() * 2);
            const ry = mine.y + 10 + Math.sin(a) * (22 + Math.random() * 2);
            ctx.lineTo(rx, ry);
        }
        ctx.lineTo(mine.x + 22, mine.y + 30);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(mine.label.toUpperCase(), mine.x, mine.y - mine.radius - 5);
        ctx.restore();

        // ── KITCHEN ZONE ───────────────────────────────────────
        const kit = ZONES.kitchen;
        ctx.save();
        const kitGrad = ctx.createRadialGradient(kit.x, kit.y, 10, kit.x, kit.y, kit.radius);
        kitGrad.addColorStop(0, 'rgba(26,17,10,0.6)');
        kitGrad.addColorStop(1, 'rgba(26,17,10,0)');
        ctx.fillStyle = kitGrad;
        ctx.beginPath(); ctx.arc(kit.x, kit.y, kit.radius, 0, Math.PI * 2); ctx.fill();

        // House body
        const hw = 48, hh = 36;
        ctx.fillStyle = '#2d1b0e';
        ctx.fillRect(kit.x - hw / 2, kit.y - hh / 2, hw, hh);
        // Door
        ctx.fillStyle = '#1a110a';
        ctx.fillRect(kit.x - 8, kit.y + hh / 2 - 18, 16, 18);
        // Roof
        ctx.fillStyle = '#3d2d1f';
        ctx.beginPath();
        ctx.moveTo(kit.x - hw / 2 - 4, kit.y - hh / 2);
        ctx.lineTo(kit.x, kit.y - hh / 2 - 18);
        ctx.lineTo(kit.x + hw / 2 + 4, kit.y - hh / 2);
        ctx.closePath();
        ctx.fill();

        // Chimney
        ctx.fillStyle = '#110b06';
        ctx.fillRect(kit.x + 10, kit.y - hh / 2 - 28, 10, 18);

        // ── KITCHEN STORAGE ──
        const drawOrePile = (type, count, startX, startY) => {
            const r = 4.5;
            const rowLen = 3;
            ctx.fillStyle = type === 'black' ? '#FF8F00' : '#81C784';
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / rowLen);
                const col = i % rowLen;
                const px = startX + col * (r * 1.8) + (row % 2) * r;
                const py = startY - row * (r * 1.5);
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        };
        if (this.world.kitchenGreenOre > 0)
            drawOrePile('green', this.world.kitchenGreenOre, kit.x - 30, kit.y + hh / 2 - 5);
        if (this.world.kitchenBlackOre > 0)
            drawOrePile('black', this.world.kitchenBlackOre, kit.x + 15, kit.y + hh / 2 - 5);

        // ── DINING AREA ──
        const dinX = kit.x + 75, dinY = kit.y + 15;
        ctx.fillStyle = '#1a110a';
        ctx.fillRect(dinX - 25, dinY, 50, 6);
        ctx.fillRect(dinX - 20, dinY + 6, 4, 18);
        ctx.fillRect(dinX + 16, dinY + 6, 4, 18);
        for (let i = 0; i < this.world.kitchenFood; i++) {
            const mx = dinX - 18 + (i % 5) * 9;
            const my = dinY - 2 - Math.floor(i / 5) * 3;
            ctx.fillStyle = '#EEEEEE';
            ctx.beginPath(); ctx.ellipse(mx, my, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f44336';
            ctx.beginPath(); ctx.arc(mx, my - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        // Draw Golden Balls
        for (let i = 0; i < this.world.kitchenGoldenBalls; i++) {
            const mx = dinX - 18 + ((i + this.world.kitchenFood) % 5) * 9;
            const my = dinY - 4 - Math.floor((i + this.world.kitchenFood) / 5) * 3;

            // Outer glow
            const grad = ctx.createRadialGradient(mx, my, 1, mx, my, 6);
            grad.addColorStop(0, '#FFF59D');
            grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();

            // Core ball
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#FBC02D';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(kit.label.toUpperCase(), kit.x, kit.y - kit.radius - 5);
        ctx.restore();

        // ── MARKET ZONE ───────────────────────────────────────
        const mkt = ZONES.market;
        ctx.save();
        const mktGrad = ctx.createRadialGradient(mkt.x, mkt.y, 8, mkt.x, mkt.y, mkt.radius);
        mktGrad.addColorStop(0, 'rgba(26,17,10,0.6)');
        mktGrad.addColorStop(1, 'rgba(26,17,10,0)');
        ctx.fillStyle = mktGrad;
        ctx.beginPath(); ctx.arc(mkt.x, mkt.y, mkt.radius, 0, Math.PI * 2); ctx.fill();

        // Stall structure
        ctx.fillStyle = '#2d1b0e';
        ctx.fillRect(mkt.x - 25, mkt.y, 50, 20);
        ctx.fillStyle = '#3d2d1f';
        ctx.beginPath();
        ctx.moveTo(mkt.x - 30, mkt.y);
        ctx.lineTo(mkt.x, mkt.y - 15);
        ctx.lineTo(mkt.x + 30, mkt.y);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(mkt.label.toUpperCase(), mkt.x, mkt.y - mkt.radius - 5);
        ctx.restore();
    }
    _drawRoots(ctx) { this.roots.forEach(r => r.draw(ctx)); }
    _drawMushrooms(ctx) { this.mushrooms.forEach(m => m.draw(ctx)); }
    _drawFoods(ctx) { this.foods.filter(f => f.alive).forEach(f => f.draw(ctx)); }
    _drawRocks(ctx) {
        this.rocks.forEach(r => {
            if (r instanceof Rock) {
                r.draw(ctx);
            } else {
                // Legacy simple rock objects
                ctx.save();
                ctx.fillStyle = r.color;
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }
    _drawOres(ctx) {
        this.ores.forEach(o => {
            const age = Date.now() - o.born;
            const alpha = age < 500 ? age / 500 : Math.min(1, (30000 - age) / 5000);
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = '#FF8F00';
            ctx.strokeStyle = '#FFD54F';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Sparkle
            ctx.fillStyle = '#FFFFcc';
            ctx.beginPath();
            ctx.arc(o.x - 1.5, o.y - 1.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    _drawEggs(ctx) { this.eggs.forEach(e => e.draw(ctx)); }
    _drawParticles(ctx) { this.particles.forEach(p => p.draw(ctx)); }

    _drawWaterDroplets(ctx) {
        this.waterDroplets.forEach(d => d.draw(ctx));
    }

    drawOffspring() {
        this.allWorms
            .filter(w => w.alive && w.role === 'offspring')
            .forEach(w => w.draw(this.ctx));
    }

    drawMainWorms() {
        if (this.tika?.alive) this.tika.draw(this.ctx);
        if (this.aha?.alive) this.aha.draw(this.ctx);
    }

    drawPredators() { this.predators.forEach(p => p.draw(this.ctx)); }

    drawOres() {
        const ctx = this.ctx;
        this.ores.forEach(o => {
            ctx.save();
            ctx.fillStyle = o.type === 'black' ? '#FF8F00' : '#81C784';
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(o.x, o.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(o.x - 1, o.y - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    drawEggs() { this.eggs.forEach(e => e.draw(this.ctx)); }
    drawParticles() { this.particles.forEach(p => p.draw(this.ctx)); }
    _drawRain(ctx) {
        if (this.world.weather !== 'RAINY') return;
        ctx.save();
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
        ctx.lineWidth = 1;
        this.rainDrops.forEach(d => {
            ctx.globalAlpha = d.life;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 1, d.y + 8);
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawHUD(ctx, W, H) {
        // Semi-transparent HUD panel
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        // Manual rounded rect for compat
        const rx = 10, ry = 10, rw = 220, rh = 160, rad = 10;
        ctx.beginPath();
        ctx.moveTo(rx + rad, ry);
        ctx.lineTo(rx + rw - rad, ry);
        ctx.arcTo(rx + rw, ry, rx + rw, ry + rad, rad);
        ctx.lineTo(rx + rw, ry + rh - rad);
        ctx.arcTo(rx + rw, ry + rh, rx + rw - rad, ry + rh, rad);
        ctx.lineTo(rx + rad, ry + rh);
        ctx.arcTo(rx, ry + rh, rx, ry + rh - rad, rad);
        ctx.lineTo(rx, ry + rad);
        ctx.arcTo(rx, ry, rx + rad, ry, rad);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        let dy = 28;
        const row = (label, val) => {
            ctx.fillStyle = '#aaa';
            ctx.fillText(label, 18, dy);
            ctx.fillStyle = '#fff';
            ctx.fillText(val, 120, dy);
            dy += 16;
        };

        // Season/weather badge
        const wIcons = { RAINY: '🌧', DRY: '🔥', CLEAR: '🌤' };
        const sIcons = { RAINY: '🌿', DRY: '🏜', MILD: '🍂' };
        row('Era', `${this.world.era} — ${sIcons[this.world.season] || ''} ${this.world.season} `);
        row('Weather', `${wIcons[this.world.weather] || ''} ${this.world.weather} `);
        row('Generation', `#${this.world.generationCount} `);
        row('Extinctions', `${this.world.extinctionCount} x 💀`);
        row('Population', `${this.allWorms.filter(w => w.alive).length} worms`);
        row('Aha Hunger', `${this.aha?.alive ? `${Math.round(this.aha.hunger)}%` : '☠'} `);
        row('Tika Hunger', `${this.tika?.alive ? `${Math.round(this.tika.hunger)}%` : '☠'} `);
        const totalCarried = this.aha?.alive ? ((this.aha.oreGreen ?? 0) + (this.aha.oreBlack ?? 0)) : 0;
        row('⛏️ Dibawa Aha', `🟢${this.aha?.oreGreen ?? 0} ⚫${this.aha?.oreBlack ?? 0} `);
        row('🍳 Dapur', `🟢${this.world.kitchenGreenOre} ⚫${this.world.kitchenBlackOre}  🍽️ ${this.world.kitchenFood} `);
        const mins = Math.floor(this.world.totalRuntime / 60000);
        const secs = Math.floor((this.world.totalRuntime % 60000) / 1000);
        row('Runtime', `${mins}m ${secs} s`);

        // Special mode badges
        if (this.world.superEvolution) {
            ctx.fillStyle = '#F44336';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('💥 SUPER EVOLUTION', 18, dy); dy += 16;
        }
        if (this.world.goldenWormActive) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('✨ GOLDEN WORM', 18, dy); dy += 16;
        }

        // Event banner
        if (this._lastEvent && now() - this._lastEvent.time < 6000) {
            const alpha = Math.max(0, 1 - (now() - this._lastEvent.time) / 6000);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(W / 2 - 200, H - 60, 400, 40);
            ctx.fillStyle = '#FFE082';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this._lastEvent.msg, W / 2, H - 34);
            ctx.textAlign = 'left';
        }

        ctx.restore();
    }
}
