import { CONSTANTS, WORLD, COLORS } from '../constants';
import { dist, clamp, random, angleTo, mutateVal, mutateColor, choose, now } from '../utils';
import { Egg } from './Egg';

// ──────────────────────────────────────────────────────────────
// Genetics – blueprint passed down per generation
// ──────────────────────────────────────────────────────────────
export function createGenetics(base = {}) {
    return {
        color: base.color || COLORS.offspring,
        size: clamp(base.size || 11, 5, 22),
        speed: clamp(base.speed || CONSTANTS.BASE_SPEED, 0.5, 5),
        length: clamp(base.length || CONSTANTS.WORM_LENGTH, 5, 30),
        trait: base.trait || choose(CONSTANTS.TRAITS),
        generation: base.generation || 1,
    };
}

export function mutateGenetics(parentA, parentB) {
    const base = parentA; // Start from parent A
    return createGenetics({
        color: mutateColor(base.color),
        size: mutateVal(base.size),
        speed: mutateVal(base.speed),
        length: Math.round(mutateVal(base.length)),
        trait: Math.random() < 0.3 ? choose(CONSTANTS.TRAITS) : base.trait, // 30% new trait
        generation: (base.generation || 1) + 1,
    });
}

// ──────────────────────────────────────────────────────────────
// Worm Class
// ──────────────────────────────────────────────────────────────
export class Worm {
    constructor(role, x, y, genetics) {
        this.role = role; // 'male' | 'female' | 'offspring'
        this.genetics = genetics || createGenetics({
            color: role === 'male' ? COLORS.male : (role === 'female' ? COLORS.female : COLORS.offspring),
        });
        this.name = role === 'male' ? 'Aha' : (role === 'female' ? 'Tika' : `Gen ${this.genetics.generation}`);

        // Segments
        this.segments = Array.from({ length: this.genetics.length }, () => ({ x, y }));

        // Vitals
        this.hunger = 60;
        this.energy = 80;
        this.stress = 0;
        this.hp = role === 'offspring' ? CONSTANTS.OFFSPRING_HP : CONSTANTS.WORM_HP;
        this.maxHp = this.hp;
        this.alive = true;
        this.isLegend = false;
        this.isGolden = false;

        // Drain rates
        this._hungerDrain = CONSTANTS.HUNGER_DRAIN;
        this._energyDrain = CONSTANTS.ENERGY_DRAIN;

        // Fighting / jealousy (Logic removed as per request)
        this.sizeMultiplier = 1.0;

        // Economy — Aha's work cycle
        this.oreGreen = 0;         // green ore (med/small rocks) in backpack
        this.oreBlack = 0;         // black ore (large rocks) in backpack
        this.miningTarget = null;  // the rock Aha is hitting
        this.lastMineTime = 0;     // cooldown between swings
        this.cookTimer = 0;        // Tika's cooking progress
        this.cookStartTime = 0;
        this.water = 0;            // Water droplets collected

        // Behavior
        this.state = CONSTANTS.STATES.IDLE;
        this.stateTimer = 0;
        this.target = null;
        this.partner = null;
        this.lastReproTime = 0;
        this.lastDangerTime = 0;
        this.birthTime = now();
        this.lifetime = 0;

        // Homecoming schedule (Aha returns home every 25-50s after a work trip)
        this._nextHomecomeAt = now() + (25000 + Math.random() * 25000);
        this._isComingHome = false;
        // Tika's home zone anchor
        this._homeX = null;
        this._homeY = null;

        // Trait bonuses computed once
        this._applyTraitBonuses();
    }

    _applyTraitBonuses() {
        const t = this.genetics.trait;
        this.speedMultiplier = 1;
        this.hungerRate = 1;
        this.senseRange = CONSTANTS.PREDATOR_HUNT_RANGE;

        if (t === 'FAST') this.speedMultiplier = 1.4;
        if (t === 'BULKY') { this.genetics.size = Math.min(this.genetics.size * 1.3, 22); this.hungerRate = 1.3; }
        if (t === 'KEEN_SENSES') this.senseRange *= 1.6;
        if (t === 'DIGGER') this.speedMultiplier = 1.2;
        if (t === 'AGILE') { this.speedMultiplier = 1.2; this.hungerRate = 0.85; }
        if (t === 'FERTILE') this.lastReproTime = -5000; // can reproduce faster
        if (t === 'HARDY') { this.hp = 150; this.hungerRate = 0.7; }
    }

    getHead() { return this.segments[0]; }

    setPartner(w) { this.partner = w; }

    getLayer() {
        const y = this.getHead().y;
        if (y < WORLD.topEnd) return 'top';
        if (y < WORLD.midEnd) return 'mid';
        return 'deep';
    }

    takeDamage(amount, source) {
        if (!this.alive) return;
        this.hp -= amount;
        this.stress = Math.min(100, this.stress + 30);
        this.lastDangerTime = now();
        if (this.hp <= 0) this.die();
    }

    die() {
        this.alive = false;
        this.state = CONSTANTS.STATES.DEAD;
    }

    // ── Decision-making ──────────────────────────────────────
    update(world) {
        if (!this.alive) return;

        // Vitals drain — per-role rates
        this.hunger -= this._hungerDrain;
        this.energy -= this._energyDrain;
        this.lifetime = (now() - this.birthTime) / 1000;

        // Partner proximity — SOFT comfort bonus only, NO forced bonding
        if (this.partner?.alive) {
            const d = dist(...this._headXY(), ...this.partner._headXY());
            if (d < CONSTANTS.NEAR_PARTNER_DIST) {
                this.stress = Math.max(0, this.stress - CONSTANTS.STRESS_RECOVER);
                this.energy = Math.min(100, this.energy + 0.002);
            }
            // Stress only rises slightly when partner is gone a very long time
            else if (d > WORLD.width * 0.7) {
                this.stress = Math.min(100, this.stress + CONSTANTS.STRESS_DRAIN * 0.3);
            }
        }

        // Stress drains energy
        this.energy -= this.stress * 0.001;

        // Clamp all
        this.hunger = clamp(this.hunger, 0, 100);
        this.energy = clamp(this.energy, 0, 100);

        // Die from starvation
        if (this.hunger <= 0) { this.hp -= 0.2; }
        if (this.energy <= 0 || this.hp <= 0) { this.die(); return; }

        // Choose action
        this._decideState(world);
        this._executeState(world);
        this._move();
        this._syncSegments();
    }

    _headXY() { return [this.getHead().x, this.getHead().y]; }

    _decideState(world) {
        const { FORAGING, FLEEING, BONDING, RESTING, REPRODUCING, IDLE } = CONSTANTS.STATES;

        // ① Danger always wins
        if (now() - this.lastDangerTime < 3000) {
            this.state = FLEEING;
            return;
        }

        // ② Starving → must eat immediately
        if (this.hunger < CONSTANTS.CRITICAL_HUNGER) {
            this.state = FORAGING;
            return;
        }

        // ③ Role-specific AI
        if (this.role === 'male') this._decideMale(world);
        else if (this.role === 'female') this._decideFemale(world);
        else this._decideOffspring(world);
    }

    // ── AHA's decision tree ──────────────────────────────────
    // He is a WORKER. He mines rocks, delivers ore home, shops at market.
    // Comes home on a schedule — like a husband returning from work.
    _decideMale(world) {
        const { FORAGING, BONDING, RESTING, REPRODUCING, IDLE, MINING, DELIVERING, SHOPPING } = CONSTANTS.STATES;

        // Rest when very tired
        if (this.energy < 25) { this.state = RESTING; return; }

        // Homecoming scheduled? Deliver ore & go bond
        if (now() >= this._nextHomecomeAt) {
            this._isComingHome = true;
        }

        if (this._isComingHome && this.partner?.alive) {
            // If carrying ore, deliver first
            if (this.oreGreen + this.oreBlack > 0) { this.state = DELIVERING; return; }
            const d = dist(...this._headXY(), ...this.partner._headXY());
            if (d < CONSTANTS.NEAR_PARTNER_DIST * 0.8) {
                this._isComingHome = false;
                this._nextHomecomeAt = now() + (25000 + Math.random() * 25000);
                this.state = IDLE;
            } else {
                this.state = BONDING;
            }
            return;
        }

        // Backpack full → deliver to kitchen
        if (this.oreGreen + this.oreBlack >= CONSTANTS.ORE_CARRY_CAP) {
            this.state = DELIVERING;
            return;
        }

        // Foraging for mushrooms/orbs (Aha's new primary diet)
        if (this.hunger < 50) {
            this.state = FORAGING;
            return;
        }

        // Occasionally visit market for vegetables
        if (this.state === IDLE && Math.random() < 0.003 && (this.oreGreen >= CONSTANTS.MARKET_VEGETABLE_COST)) {
            this.state = SHOPPING;
            return;
        }

        // Default work loop: mine rocks
        if (this.state === IDLE) {
            this.state = MINING;
        }
    }

    // ── TIKA's decision tree ─────────────────────────────────
    // She is a HOMEMAKER. She cooks ore into meals, forages nearby,
    // rests, lays eggs, and defends her territory from rival males.
    _decideFemale(world) {
        const { FORAGING, RESTING, REPRODUCING, IDLE, COOKING, FIGHTING } = CONSTANTS.STATES;

        // Anchor home zone to the kitchen zone
        if (!this._homeX && world.zones) {
            this._homeX = world.zones.kitchen.x;
            this._homeY = world.zones.kitchen.y;
        }

        // Rest when tired
        if (this.energy < 35) { this.state = RESTING; return; }

        // 🍳 Cook if there's BOTH green AND black ore in the kitchen
        if (world.world &&
            world.world.kitchenGreenOre >= CONSTANTS.COOK_GREEN_ORE_COST &&
            world.world.kitchenBlackOre >= CONSTANTS.COOK_BLACK_ORE_COST &&
            world.world.kitchenFood < CONSTANTS.KITCHEN_CAP) {
            if (this.state !== COOKING) {
                this.state = COOKING;
                this.cookStartTime = now();
            }
            return;
        }

        // Lay egg when Aha is nearby AND conditions met
        const partnerNear = this.partner?.alive &&
            dist(...this._headXY(), ...this.partner._headXY()) < CONSTANTS.NEAR_PARTNER_DIST;
        const readyToRepro = partnerNear
            && this.hunger >= CONSTANTS.REPRODUCE_HUNGER_MIN
            && this.energy >= CONSTANTS.REPRODUCE_ENERGY_MIN
            && (now() - this.lastReproTime) > CONSTANTS.REPRO_COOLDOWN
            && this.getLayer() !== 'top';
        if (readyToRepro) { this.state = REPRODUCING; return; }

        // Forage close to home zone only
        if (this.state === IDLE || this.state === RESTING) {
            if (Math.random() < 0.007) this.state = FORAGING;
        }
    }

    // ── Offspring decision tree ───────────────────────────────
    _decideOffspring(world) {
        const { FORAGING, RESTING, IDLE } = CONSTANTS.STATES;
        if (this.energy < 25) { this.state = RESTING; return; }
        if (this.state === IDLE) {
            if (Math.random() < 0.008) this.state = FORAGING;
        }
    }

    _executeState(world) {
        const { FORAGING, FLEEING, BONDING, RESTING, REPRODUCING, IDLE,
            FIGHTING, MINING, PICKUP, DELIVERING, SHOPPING, COOKING } = CONSTANTS.STATES;
        const head = this.getHead();

        switch (this.state) {

            // ── FORAGING: find & eat food ──────────────────────────
            case FORAGING: {
                // Priority 1: Check Kitchen Dining Table for Golden Balls
                const kitchen = world.zones?.kitchen;
                if (kitchen && world.world.kitchenGoldenBalls > 0) {
                    this.target = { x: kitchen.x + 75, y: kitchen.y + 15 };
                    if (dist(head.x, head.y, this.target.x, this.target.y) < 15) {
                        world.world.kitchenGoldenBalls--;
                        this.hunger = Math.min(100, this.hunger + 100);
                        this.sizeMultiplier += 0.5; // GROW!
                        this.target = null;
                        this.state = IDLE;
                        if (world._onEvent) world._onEvent('EAT', `🌟 ${this.name} memakan BOLA EMAS dan menjadi BESAR!`);
                    }
                    break;
                }

                // Priority 2: Check Kitchen Dining Table for regular meals
                if (kitchen && world.world.kitchenFood > 0) {
                    this.target = { x: kitchen.x + 75, y: kitchen.y + 15 }; // Dining Table position
                    if (dist(head.x, head.y, this.target.x, this.target.y) < 15) {
                        world.world.kitchenFood--;
                        this.hunger = Math.min(100, this.hunger + CONSTANTS.MEAL_HUNGER_RESTORE);
                        this.target = null;
                        this.state = IDLE;
                        if (world._onEvent) world._onEvent('EAT', `🍽️ ${this.role === 'male' ? 'Aha' : 'Tika'} makan di meja!`);
                    }
                    break;
                }

                if (!this.target || !world.foods.includes(this.target)) {
                    const foods = world.foods.filter(f => f.alive);
                    if (foods.length > 0) {
                        const sorted = foods.sort((a, b) =>
                            dist(head.x, head.y, a.x, a.y) - dist(head.x, head.y, b.x, b.y));
                        const preferred = this.role === 'male'
                            ? sorted[0]
                            : (sorted.find(f => f.y > WORLD.topEnd) || sorted[0]);
                        this.target = preferred;
                    } else {
                        if (!this.target) this._setWanderTarget(world);
                    }
                }
                if (this.target?.alive && dist(head.x, head.y, this.target.x, this.target.y) < 14) {
                    this.hunger = Math.min(100, this.hunger + (this.target.nutrition || 20));
                    this.target.alive = false;
                    this.target = null;
                    this.state = IDLE;
                }
                const nearMush = world.mushrooms?.find(m =>
                    m.alive && dist(head.x, head.y, m.x, m.y) < m.size + 10);
                if (nearMush) {
                    this.hunger = Math.min(100, this.hunger + nearMush.nutrition);
                    nearMush.alive = false;
                    this.state = IDLE;
                }
                break;
            }

            // ── MINING: Aha swings at rocks in the mine zone ───────
            case MINING: {
                // Find a target rock
                const rocks = world.rocks?.filter(r => r.alive !== false && r.hp > 0) ?? [];
                if (!this.miningTarget || !rocks.includes(this.miningTarget) || !this.miningTarget.alive) {
                    this.miningTarget = rocks.sort((a, b) =>
                        dist(head.x, head.y, a.x, a.y) - dist(head.x, head.y, b.x, b.y))[0] ?? null;
                }
                if (!this.miningTarget) { this.state = IDLE; break; }

                // Walk toward rock
                this.target = { x: this.miningTarget.x, y: this.miningTarget.y };
                const dRock = dist(head.x, head.y, this.miningTarget.x, this.miningTarget.y);

                // Head banging animation logic
                const isMining = dRock < this.miningTarget.radius + 25;
                if (isMining) {
                    // Lunge head toward rock funny way
                    const angleToRock = angleTo(head.x, head.y, this.miningTarget.x, this.miningTarget.y);
                    const lunge = Math.sin(now() * 0.015) * 15;
                    head.x += Math.cos(angleToRock) * lunge;
                    head.y += Math.sin(angleToRock) * lunge;
                }

                // Swing when close enough
                if (dRock < this.miningTarget.radius + 18 &&
                    now() - this.lastMineTime >= CONSTANTS.MINE_HIT_COOLDOWN) {
                    this.lastMineTime = now();
                    const result = this.miningTarget.takeDamage(CONSTANTS.MINE_HIT_DAMAGE, world.particles);
                    if (result.drops && result.drops.length > 0) {
                        // ROCK BROKE! Spawn physical ores on the ground.
                        result.drops.forEach(drop => {
                            const angle = Math.random() * Math.PI * 2;
                            const distFromCenter = Math.random() * 15;
                            // Add velocity so they bounce out (terpental)
                            const speed = 2 + Math.random() * 3;
                            world.ores.push({
                                x: this.miningTarget.x + Math.cos(angle) * distFromCenter,
                                y: this.miningTarget.y + Math.sin(angle) * distFromCenter,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed - 2, // slight upward pop
                                type: drop.type,
                                born: Date.now(),
                                alive: true
                            });
                        });
                        const totalDrops = result.drops.length;
                        const types = result.drops.map(d => d.type === 'black' ? '⚫' : '🟢').join('');
                        this.miningTarget = null;
                        if (world._onEvent) world._onEvent('MINE', `⛏️ Batu pecah! Ada ${totalDrops} biji (${types}) di tanah!`);

                        // Switch to PICKUP state to go grab one
                        this.state = PICKUP;
                    }
                }
                break;
            }

            // ── PICKUP: Aha looks for items on the ground ──────────
            case PICKUP: {
                if (this.oreGreen + this.oreBlack >= CONSTANTS.ORE_CARRY_CAP) {
                    this.state = DELIVERING;
                    break;
                }

                // Find nearest ore in world (regardless of type, picking closest one)
                const ores = (world.ores || []).filter(o => o.alive);
                if (ores.length > 0) {
                    const nearest = ores.sort((a, b) =>
                        dist(head.x, head.y, a.x, a.y) - dist(head.x, head.y, b.x, b.y))[0];
                    this.target = nearest;

                    // Walk to ore
                    if (dist(head.x, head.y, nearest.x, nearest.y) < 14) {
                        if (nearest.type === 'black') this.oreBlack++;
                        else this.oreGreen++;

                        nearest.alive = false; // "Pick it up"
                        this.target = null;
                        this.state = DELIVERING;
                        if (world._onEvent) world._onEvent('PICKUP', `💎 Aha memungut biji ${nearest.type === 'black' ? 'hitam ⚫' : 'hijau 🟢'}`);
                    }
                } else {
                    // No ore on ground? Go back to mining or IDLE
                    this.target = null;
                    this.state = MINING;
                }
                break;
            }

            // ── DELIVERING: Aha walks to kitchen, drops ore ────────
            case DELIVERING: {
                const kitchen = world.zones?.kitchen;
                if (!kitchen) { this.state = IDLE; break; }
                this.target = { x: kitchen.x, y: kitchen.y };
                if (dist(head.x, head.y, kitchen.x, kitchen.y) < kitchen.radius * 0.6) {
                    // Deposit ores by type
                    const g = this.oreGreen, b = this.oreBlack;
                    world.world.kitchenGreenOre += g;
                    world.world.kitchenBlackOre += b;
                    if (world._onEvent && (g + b > 0)) world._onEvent('DELIVER',
                        `🪨 Aha antar 🟢${g} ⚫${b} ke dapur!`);
                    this.oreGreen = 0;
                    this.oreBlack = 0;
                    this.state = IDLE;
                    // Eat from kitchen if hungry
                    if (this.hunger < 60 && world.world.kitchenFood > 0) {
                        world.world.kitchenFood--;
                        this.hunger = Math.min(100, this.hunger + CONSTANTS.MEAL_HUNGER_RESTORE);
                    }
                }
                break;
            }

            // ── SHOPPING: Aha buys vegetables at the market ────────
            case SHOPPING: {
                const market = world.zones?.market;
                if (!market) { this.state = IDLE; break; }
                this.target = { x: market.x, y: market.y };
                if (dist(head.x, head.y, market.x, market.y) < market.radius * 0.7) {
                    // Buy vegetables with green ore
                    if (this.oreGreen >= CONSTANTS.MARKET_VEGETABLE_COST) {
                        this.oreGreen -= CONSTANTS.MARKET_VEGETABLE_COST;
                        this.hunger = Math.min(100, this.hunger + CONSTANTS.MARKET_VEGETABLE_HUNGER);
                        if (world._onEvent) world._onEvent('SHOP',
                            '🛒 Aha beli sayur di pasar!');
                    }
                    this.state = DELIVERING;
                }
                break;
            }

            // ── COOKING: Tika converts ore into meals ──────────────
            case COOKING: {
                const kitchen = world.zones?.kitchen;
                if (!kitchen) { this.state = IDLE; break; }
                this.target = { x: kitchen.x, y: kitchen.y };
                if (dist(head.x, head.y, kitchen.x, kitchen.y) < kitchen.radius * 0.5) {
                    if (!this.cookStartTime) {
                        this.cookStartTime = now();
                    }
                    const progress = (now() - this.cookStartTime) / CONSTANTS.COOK_DURATION;
                    this.cookProgress = progress;

                    if (progress >= 1) {
                        world.world.kitchenGreenOre -= CONSTANTS.COOK_GREEN_ORE_COST;
                        world.world.kitchenBlackOre -= CONSTANTS.COOK_BLACK_ORE_COST;
                        world.world.kitchenGoldenBalls++; // Produce Golden Ball
                        this.cookStartTime = null;
                        this.cookProgress = 0;
                        this.state = IDLE;
                        if (world._onEvent) world._onEvent('COOK', '🧙‍♀️ Tika memasak BOLA EMAS! Ukuran tubuh bisa berubah!');
                    }
                } else {
                    this.cookStartTime = null;
                    this.cookProgress = 0;
                }
                break;
            }

            // ── FIGHTING: Tika chases rival males ─────────────────
            case FIGHTING: {
                if (!this.rivalTarget?.alive) {
                    this.rivalTarget = null;
                    this.state = IDLE;
                    break;
                }
                const rival = this.rivalTarget;
                const rHead = rival.getHead();
                this.target = { x: rHead.x, y: rHead.y };
                const dToRival = dist(head.x, head.y, rHead.x, rHead.y);
                if (dToRival < 22 && now() - this.lastFightTime > CONSTANTS.FIGHT_COOLDOWN) {
                    this.lastFightTime = now();
                    rival.takeDamage(CONSTANTS.FIGHT_DAMAGE, 'tika');
                    rival.lastDangerTime = now();
                    if (world._onEvent) world._onEvent('FIGHT',
                        `😤 Tika usir ${rival.name ?? 'cacing lain'}!`);
                }
                if (dToRival > CONSTANTS.JEALOUSY_RANGE * 1.8) {
                    this.rivalTarget = null;
                    this.state = IDLE;
                }
                break;
            }

            case FLEEING: {
                const fleeY = Math.min(WORLD.height - 30, head.y + 60);
                this.target = { x: head.x + (Math.random() - 0.5) * 200, y: fleeY };
                break;
            }

            case BONDING: {
                if (this.partner?.alive) this.target = this.partner.getHead();
                break;
            }

            case RESTING: {
                if (!this.target || dist(head.x, head.y, this.target.x, this.target.y) < 10) {
                    this._setWanderTarget(world, 60);
                }
                // Eat from kitchen if resting and hungry
                if (this.role !== 'offspring' && this.hunger < 60 && world.world?.kitchenFood > 0) {
                    world.world.kitchenFood--;
                    this.hunger = Math.min(100, this.hunger + CONSTANTS.MEAL_HUNGER_RESTORE);
                }
                break;
            }

            case REPRODUCING: {
                if (this.partner?.alive) {
                    const d = dist(...this._headXY(), ...this.partner._headXY());
                    if (d < 30) {
                        const genetics = mutateGenetics(this.partner.genetics, this.genetics);
                        const egg = new Egg(head.x + random(-10, 10), head.y + random(-10, 10), genetics, this.role);
                        world.eggs.push(egg);
                        this.lastReproTime = now();
                        this.hunger -= 20;
                        this.energy -= 15;
                        this.state = IDLE;
                    } else {
                        this.target = this.partner.getHead();
                    }
                }
                break;
            }

            // ── WATERING: Aha brings water to the surface plant ──────
            case CONSTANTS.STATES.WATERING: {
                const plant = world.plant;
                if (!plant) { this.state = CONSTANTS.STATES.IDLE; break; }
                this.target = { x: plant.x, y: plant.y };
                if (dist(head.x, head.y, plant.x, plant.y) < 30) {
                    if (this.water > 0) {
                        const amount = this.water;
                        this.water = 0;
                        world.plantPoints += amount * 50; // Each drop adds 50 points
                        if (world._onEvent) world._onEvent('PLANT', `🌱 Aha menyirami tanaman! (+${amount * 50} poin)`);
                    }
                    this.state = CONSTANTS.STATES.IDLE;
                }
                break;
            }

            default:
                if (!this.target || dist(head.x, head.y, this.target.x, this.target.y) < 10) {
                    this._setWanderTarget(world);
                }
        }
    }


    _setWanderTarget(world, radius = 200) {
        const head = this.getHead();
        let tx, ty;
        const mineZone = world.zones?.mine;

        if (this.role === 'female' && this._homeX) {
            const fr = Math.min(radius, 120);
            tx = clamp(this._homeX + (Math.random() - 0.5) * fr, 10, WORLD.width - 10);
            ty = clamp(this._homeY + (Math.random() - 0.5) * fr, WORLD.topEnd + 10, WORLD.midEnd - 10);
        } else if (this.role === 'male') {
            // Aha prioritizes water if raining and he has none
            const water = (world.waterDroplets || []).find(d => d.alive);
            if (this.water === 0 && water && world.world?.weather === 'RAINY') {
                this.target = { x: water.x, y: water.y };
                if (dist(head.x, head.y, water.x, water.y) < 15) {
                    water.alive = false;
                    this.water++;
                    if (world._onEvent) world._onEvent('WATER', '💧 Aha memungut tetesan air!');
                    this.state = CONSTANTS.STATES.WATERING;
                }
                return;
            }
            // Aha wanders toward mine zone when working
            if (mineZone && (this.state === CONSTANTS.STATES.MINING || this.state === CONSTANTS.STATES.IDLE)) {
                tx = clamp(mineZone.x + (Math.random() - 0.5) * mineZone.radius * 2, 10, WORLD.width - 10);
                ty = clamp(mineZone.y + (Math.random() - 0.5) * mineZone.radius, WORLD.topEnd + 10, WORLD.midEnd - 10);
            } else {
                tx = clamp(head.x + (Math.random() - 0.5) * radius, 10, WORLD.width - 10);
                ty = clamp(head.y + (Math.random() - 0.5) * radius, 10, WORLD.height - 10);
            }
        } else {
            tx = clamp(head.x + (Math.random() - 0.5) * radius, 10, WORLD.width - 10);
            ty = clamp(head.y + (Math.random() - 0.5) * radius, WORLD.topEnd, WORLD.height - 10);
        }
        this.target = { x: tx, y: ty };
    }

    _move() {
        if (!this.target) return;
        const head = this.getHead();
        const angle = angleTo(head.x, head.y, this.target.x, this.target.y);
        head.angle = angle; // Store for drawing mouth items
        let spd = this.genetics.speed * this.speedMultiplier;
        if (this.state === CONSTANTS.STATES.RESTING) spd *= 0.3;
        if (this.state === CONSTANTS.STATES.FLEEING) spd *= 1.5;

        head.x = clamp(head.x + Math.cos(angle) * spd, 5, WORLD.width - 5);
        head.y = clamp(head.y + Math.sin(angle) * spd, 5, WORLD.height - 5);
    }

    _syncSegments() {
        const spacing = this.genetics.size * 0.6 * this.sizeMultiplier;
        for (let i = 1; i < this.segments.length; i++) {
            const leader = this.segments[i - 1];
            const follower = this.segments[i];
            const d = dist(leader.x, leader.y, follower.x, follower.y);
            if (d > spacing) {
                const a = angleTo(follower.x, follower.y, leader.x, leader.y);
                follower.x = leader.x - Math.cos(a) * spacing;
                follower.y = leader.y - Math.sin(a) * spacing;
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        const head = this.getHead();
        const sz = this.genetics.size * this.sizeMultiplier;

        // Draw segments
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const s = this.segments[i];
            const t = 1 - i / this.segments.length;
            const r = sz * 0.5 * (0.4 + t * 0.6);
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = this.isGolden ? '#FFD700' : this.genetics.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Head highlight
        ctx.save();
        ctx.fillStyle = this.isGolden ? '#FFE57F' : this.genetics.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, sz * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        if (this.target) {
            const ea = angleTo(head.x, head.y, this.target.x || head.x, this.target.y || head.y);
            const ex = head.x + Math.cos(ea) * sz * 0.3;
            const ey = head.y + Math.sin(ea) * sz * 0.3;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex, ey, sz * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ex + Math.cos(ea), ey + Math.sin(ea), sz * 0.09, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── Ore carry visualization ────────────────────────────────
        // Render carried item in the mouth (realistically)
        if (this.role === 'male' && (this.oreGreen > 0 || this.oreBlack > 0)) {
            ctx.save();
            const angle = head.angle || 0;
            const dist = sz * 0.6; // Scale with growth!
            const mouthX = head.x + Math.cos(angle) * dist;
            const mouthY = head.y + Math.sin(angle) * dist;

            // Draw the "mouth ball"
            ctx.beginPath();
            ctx.arc(mouthX, mouthY, sz * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = this.oreBlack > 0 ? '#FF8F00' : '#81C784';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Tiny sparkle on the item
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mouthX - 1.5, mouthY - 1.5, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Cooking Progress Bar ──────────────────────────────────
        if (this.state === 'COOKING' && this.cookProgress > 0) {
            const barW = 30, barH = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(head.x - barW / 2, head.y - sz - 15, barW, barH);
            ctx.fillStyle = '#FFEB3B';
            ctx.fillRect(head.x - barW / 2, head.y - sz - 15, barW * Math.min(1, this.cookProgress), barH);
        }

        // Name + state emote
        const emote = {
            FORAGING: '🔍',
            FLEEING: '💨',
            BONDING: '💕',
            RESTING: '💤',
            REPRODUCING: '💞',
            HUNTING: '⚔️',
            MINING: '⛏️',
            PICKUP: '🤏',
            DELIVERING: '🪨',
            SHOPPING: '🛒',
            COOKING: '🍳',
            FIGHTING: '🥊',
        }[this.state] || '';

        ctx.save();
        ctx.fillStyle = this.isLegend ? '#FFD700' : 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${this.isLegend ? 11 : 9}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${this.name} ${emote}`, head.x, head.y - sz - 4);
        ctx.restore();

        // HP / Status bar (only for main characters)
        if (this.role !== 'offspring') {
            const bw = 30, bh = 3;
            const bx = head.x - bw / 2;
            const by = head.y - sz - 16;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = this.hunger > 50 ? '#4CAF50' : '#FF5722';
            ctx.fillRect(bx, by, bw * (this.hunger / 100), bh);
        }
    }
}
