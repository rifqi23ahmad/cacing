import { CONSTANTS } from '../constants';
import { choose, now } from '../utils';

export class WorldState {
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
        this.kitchenGreenOre = 0;
        this.kitchenBlackOre = 0;
        this.kitchenFood = 0;
        this.kitchenGoldenBalls = 0;

        // Growth
        this.plantPoints = 0;
        this.dailyPlantPoints = 0;
        this.lastDailyReset = now();
    }
}
