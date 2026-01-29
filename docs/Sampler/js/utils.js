export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function pixelToSeconds(px, canvas, buffer) { return (px / canvas.width) * buffer.duration; }
export function secondsToPixel(sec, canvas, buffer) { return (sec / buffer.duration) * canvas.width; }
