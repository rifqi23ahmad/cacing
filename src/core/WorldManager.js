import { CONSTANTS, WORLD, COLORS } from '../constants';
import { Worm, createGenetics } from '../classes/Worm';
import { Mushroom, Root } from '../classes/WorldFeature';
import { Rock } from '../classes/Rock';
import { Plant } from '../classes/Plant';
import { random, choose, now, clamp, mutateColor } from '../utils';

export class WorldManager {
    constructor(engine) {
        this.engine = engine;
    }

    generateWorld() {
        const { engine } = this;
        engine.foods = [];
        engine.mushrooms = [];
        engine.roots = [];

        const W = WORLD.width, H = WORLD.height;

        // Initial food spread
        for (let i = 0; i < 40; i++) engine._spawnFood();

        // Mushrooms
        for (let i = 0; i < 10; i++) {
            engine.mushrooms.push(new Mushroom(random(50, W - 50), random(WORLD.topEnd * 1.1, H - 30)));
        }

        // Roots
        for (let i = 0; i < 25; i++) {
            engine.roots.push(new Root(random(0, W), random(WORLD.topEnd * 0.5, H)));
        }

        engine.plant = new Plant(W / 2, WORLD.topEnd, 'main');
    }

    checkEvolution(world) {
        if (now() - world.seasonTimer > CONSTANTS.SEASON_SHIFT_INTERVAL) {
            world.seasonTimer = now();
            world.season = choose(CONSTANTS.SEASONS);
            const rng = Math.random();
            world.weather = rng < 0.33 ? 'RAINY' : rng < 0.66 ? 'DRY' : 'CLEAR';
            world.era++;
            this.generateWorld();
            this.engine._announceEvent(`🌍 Season Shift: ${world.season} | Weather: ${world.weather}`);
        }

        if (now() - world.eraTimer > CONSTANTS.ERA_MUTATION_INTERVAL) {
            world.eraTimer = now();
            this.engine.allWorms.filter(w => w.alive).forEach(w => {
                w.genetics.speed = clamp(w.genetics.speed * (0.9 + Math.random() * 0.3), 0.5, 6);
                w.genetics.size = clamp(w.genetics.size + (Math.random() - 0.5) * 2, 5, 22);
            });
            this.engine._announceEvent('⚡ ERA MUTATION! All living worms evolve.');
        }
    }

    checkDeathAndRespawn(world) {
        const { engine } = this;
        const ahaDead = !engine.aha?.alive;
        const tikaDead = !engine.tika?.alive;

        if (ahaDead && tikaDead) {
            if (engine.eggs.length > 0) return;
            world.extinctionCount++;
            if (world.extinctionCount >= 3) world.superEvolution = true;
            engine._announceEvent(`💀 Extinction #${world.extinctionCount}. New generation rises...`);
            world.generationCount++;
            engine._spawnMainCharacters();
        } else if (ahaDead) {
            if (engine.eggs.find(e => e.alive)) return;
            world.generationCount++;
            const newGen = createGenetics({ color: COLORS.male, speed: 2, generation: world.generationCount });
            engine.aha = new Worm('male', WORLD.width / 2, WORLD.height / 2, newGen);
            engine.aha.setPartner(engine.tika);
            if (engine.tika?.alive) engine.tika.setPartner(engine.aha);
            engine.allWorms.push(engine.aha);
            engine._announceEvent('🐛 New Aha has emerged!');
        } else if (tikaDead) {
            if (engine.eggs.find(e => e.alive)) return;
            world.generationCount++;
            const newGen = createGenetics({ color: mutateColor(COLORS.female), speed: 1.7, generation: world.generationCount });
            engine.tika = new Worm('female', WORLD.width / 2 + 40, WORLD.height / 2, newGen);
            engine.tika.setPartner(engine.aha);
            if (engine.aha?.alive) engine.aha.setPartner(engine.tika);
            engine.allWorms.push(engine.tika);
            engine._announceEvent('🐛 A new Tika has appeared!');
        }
    }
}
