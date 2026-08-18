/**
 * DreamStream 99 runtime selection.
 *
 * GitHub Pages uses the zero-backend demo client. A future Cloudflare Worker
 * deployment can override this file (or define WT_RUNTIME before it loads).
 */
const isStaticDemo = window.location.protocol === 'file:'
  || window.location.hostname.endsWith('.github.io');

window.WT_RUNTIME = {
  mode: isStaticDemo ? 'demo' : 'socketio',
  apiUrl: isStaticDemo ? null : '/api/rooms',
  socketIoUrl: null,
  socketIoClientUrl: '/socket.io/socket.io.js',
  websocketUrl: null,
  ...window.WT_RUNTIME,
};
