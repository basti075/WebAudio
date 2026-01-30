export const KEY_TO_PAD = {
  // bottom row -> pads 0..3
  'y': 0, 'x': 1, 'c': 2, 'v': 3,
  // next row -> pads 4..7
  'a': 4, 's': 5, 'd': 6, 'f': 7,
  // next row -> pads 8..11
  'q': 8, 'w': 9, 'e': 10, 'r': 11,
  // top numbers -> pads 12..15
  '1': 12, '2': 13, '3': 14, '4': 15,
};


export function getPadIndexForKey(key) {
  if (!key) return null;
  const k = String(key).toLowerCase();
  return Object.prototype.hasOwnProperty.call(KEY_TO_PAD, k) ? KEY_TO_PAD[k] : null;
}


export function bindKeyboardToPads(onPadTrigger, options = {}) {
  if (typeof onPadTrigger !== 'function') throw new TypeError('onPadTrigger must be a function');
  const { preventDefault = true, filter = null } = options;

  function handler(e) {
    const pad = getPadIndexForKey(e.key);
    if (pad === null) return;
    if (filter && !filter(e, pad)) return;
    if (preventDefault) e.preventDefault();
    onPadTrigger(pad, e);
  }

  window.addEventListener('keydown', handler);
  return function unbind() { window.removeEventListener('keydown', handler); };
}

export function getMappedKeys() { return Object.keys(KEY_TO_PAD).slice(); }
