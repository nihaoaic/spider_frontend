// Polyfill for globalThis.crypto.getRandomValues in Node environments where it's missing
// This file is safe to require before running Vite.
(function() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    return;
  }

  try {
    const nodeCrypto = require('crypto');
    if (nodeCrypto.webcrypto && typeof nodeCrypto.webcrypto.getRandomValues === 'function') {
      globalThis.crypto = nodeCrypto.webcrypto;
    } else {
      // Fallback: provide getRandomValues using randomFillSync
      globalThis.crypto = {
        getRandomValues: function (buffer) {
          if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
            throw new TypeError('Expected Buffer or Uint8Array');
          }
          // node: randomFillSync works with Buffer/Uint8Array
          nodeCrypto.randomFillSync(buffer);
          return buffer;
        }
      };
    }
  } catch (e) {
    // If require('crypto') fails for some reason, leave crypto undefined and Vite will error with the original message.
    // We deliberately don't throw here to keep startup behavior predictable.
    // console.warn('crypto polyfill failed:', e);
  }
})();
