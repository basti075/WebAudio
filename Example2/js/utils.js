function distance(x1, y1, x2, y2) {
    let y = x2 - x1;
    let x = y2 - y1;

    return Math.sqrt(x * x + y * y);
}

// pixels -> seconds
function pixelToSeconds(x, bufferDuration, canvasWidth) {
    let result = x * bufferDuration / canvasWidth;
    return result;
}

export { distance, pixelToSeconds };