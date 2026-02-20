import { CONSTANTS, WORLD, ZONES } from '../constants';
import { Worm } from '../classes/Worm';
import { Rock } from '../classes/Rock';
import { WaterDroplet } from '../classes/WorldFeature';
import { random, now } from '../utils';

import { WorldState } from './WorldState';
import { WorldManager } from './WorldManager';
import { Renderer } from './Renderer';

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

        // Modules
        this.world = new WorldState();
        this.worldManager = new WorldManager(this);
        this.renderer = new Renderer(this);

        // Compatibility for Worm logic
        this.zones = ZONES;

        // Entity Lists
        this.aha = null;
        this.tika = null;
        this.eggs = [];
        this.foods = [];
        this.mushrooms = [];
        this.roots = [];
        this.rocks = [];
        this.ores = [];
        this.particles = [];
        this.allWorms = [];
        this.waterDroplets = [];
        this.rainDrops = [];
        this.plant = null;

        this.setup();
    }

    setup() {
        this._resize();
        window.addEventListener('resize', () => this._resize());
        this.worldManager.generateWorld();
        this._spawnRocks();
        this._spawnMainCharacters();
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        WORLD.width = this.canvas.width;
        WORLD.height = this.canvas.height;

        // Update ZONES
        ZONES.mine.x = WORLD.width * 0.15;
        ZONES.mine.y = WORLD.topEnd + (WORLD.midEnd - WORLD.topEnd) * 0.4;
        ZONES.kitchen.x = WORLD.width * 0.65;
        ZONES.kitchen.y = WORLD.topEnd + (WORLD.midEnd - WORLD.topEnd) * 0.5;
    }

    _spawnRocks() {
        this.rocks = [
            new Rock(ZONES.mine.x - 40, ZONES.mine.y - 20, 'large'),
            new Rock(ZONES.mine.x + 20, ZONES.mine.y + 15, 'medium'),
            new Rock(ZONES.mine.x - 10, ZONES.mine.y + 40, 'medium'),
            new Rock(ZONES.mine.x + 55, ZONES.mine.y - 30, 'small'),
            new Rock(ZONES.mine.x - 60, ZONES.mine.y + 50, 'small'),
            new Rock(ZONES.mine.x + 30, ZONES.mine.y + 55, 'small'),
        ];
    }

    _spawnMainCharacters() {
        this.allWorms = [];
        // Aha (Male)
        this.aha = new Worm('male', WORLD.width * 0.4, WORLD.topEnd + 50);
        // Tika (Female)
        this.tika = new Worm('female', WORLD.width * 0.6, WORLD.topEnd + 50);

        this.aha.setPartner(this.tika);
        this.tika.setPartner(this.aha);

        this.allWorms.push(this.aha, this.tika);
        this._linkWorldToWorms();
    }

    _linkWorldToWorms() {
        const link = (w) => {
            w.world = this;
            w._onEvent = (type, msg) => this._announceEvent(msg);
        };
        this.allWorms.forEach(link);
    }

    _spawnFood() {
        // Simple food spawn
        this.foods.push({
            x: random(50, WORLD.width - 50),
            y: random(WORLD.topEnd + 20, WORLD.height - 20),
            draw: function (ctx) {
                ctx.fillStyle = '#81C784';
                ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

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
        this.renderer.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.world.totalRuntime = now() - this.startTime;

        // Basic Updates
        if (Math.random() < 0.05) this._spawnFood();

        this.allWorms.forEach(w => w.update(this));
        this.rocks.forEach(r => r.checkRespawn());
        this.ores.forEach(o => {
            if (o.vx !== undefined) {
                o.x += o.vx;
                o.y += o.vy;
                o.vy += 0.2; // gravity
                o.vx *= 0.95;
                o.vy *= 0.95;

                // Simulated ground settlement
                if (o.y > (o.floorY || WORLD.height - 10)) {
                    o.y = (o.floorY || WORLD.height - 10);
                    o.vy *= -0.3; // low bounce
                    if (Math.abs(o.vy) < 0.5) o.vy = 0;
                    if (Math.abs(o.vx) < 0.1) o.vx = 0;
                }
            }
        });
        this.ores = this.ores.filter(o => o.alive !== false && (Date.now() - o.born < 30000));

        // Modules handle complex logic
        this.worldManager.checkEvolution(this.world);
        this.worldManager.checkDeathAndRespawn(this.world);

        this._notifyUI();
    }

    _announceEvent(msg) {
        this._lastEvent = { msg, time: now() };
        console.log('[World Event]', msg);
    }

    _notifyUI() {
        if (!this.updateUI) return;
        this.updateUI({
            ahaStamina: Math.round(this.aha?.hunger || 0),
            tikaEnergy: Math.round(this.tika?.hunger || 0),
            cookingProgress: Math.round((this.tika?.cookProgress || 0) * 100),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            goldenWorm: this.world.goldenWormActive
        });
    }
}
