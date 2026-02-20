// ============================================================
// UTILS
// ============================================================

export const random = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(random(min, max + 1));
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mapRange = (v, a1, a2, b1, b2) => b1 + ((v - a1) / (a2 - a1)) * (b2 - b1);
export const now = () => Date.now();

/** Mutate a numeric value by ±factor*100% */
export const mutateVal = (v, factor = 0.15) => {
    const delta = v * factor * (Math.random() * 2 - 1);
    return v + delta;
};

/** Mutate a color string (hex) slightly */
export const mutateColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const d = () => clamp(Math.round((Math.random() - 0.5) * 60), -255, 255);
    const toHex = (n) => clamp(n, 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r + d())}${toHex(g + d())}${toHex(b + d())}`;
};

/** Choose an item from an array with equal weight */
export const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Weighted random choice: items = [{value, weight}] */
export const chooseWeighted = (items) => {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.value;
    }
    return items[items.length - 1].value;
};

/** Convert angle + dist to vector */
export const angleToVec = (angle, len = 1) => ({ x: Math.cos(angle) * len, y: Math.sin(angle) * len });

/** Return angle from (ax,ay) to (bx,by) */
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
