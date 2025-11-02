async function loadAndDecodeSound(url, ctx) {
  const response = await fetch(url);
  const sound = await response.arrayBuffer();

  console.log("Sound loaded as arrayBuffer    ");

  // decode arrayBuffer
  const decodedSound = await ctx.decodeAudioData(sound);
  console.log("Sound decoded");

  return decodedSound;
};

// build a simple buffer->destination graph
function buildAudioGraph(ctx, buffer) {
  let bufferSource = ctx.createBufferSource();
  bufferSource.buffer = buffer;
  bufferSource.connect(ctx.destination);
  return bufferSource;
}

function playSound(ctx, buffer, startTime, endTime) {
  // clamp times to buffer duration
  if (startTime < 0) startTime = 0;
  if (endTime > buffer.duration) endTime = buffer.duration;

  // create one-shot source
  let bufferSource = buildAudioGraph(ctx, buffer);
  // start(when,start,duration)
  bufferSource.start(0, startTime, endTime);
}


// exports
export { loadAndDecodeSound, playSound };