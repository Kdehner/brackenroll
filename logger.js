// Dev logger — namespaced, gated by localStorage.
//
// Enable in DevTools:
//   localStorage.setItem('br:debug', '*')          // all namespaces
//   localStorage.setItem('br:debug', 'auth,data')  // specific namespaces
//   localStorage.removeItem('br:debug')             // disable
//
// Namespaces: auth · data · realtime · table
//
// warn() and error() always fire regardless of debug setting.

const raw     = (typeof localStorage !== 'undefined' && localStorage.getItem('br:debug')) || '';
const allOn   = raw === '*';
const enabled = new Set(raw.split(',').map(s => s.trim()).filter(Boolean));

export function makeLog(ns) {
    const on  = allOn || enabled.has(ns);
    const tag = `[br:${ns}]`;
    return {
        info:  (...a) => on  && console.log(tag, ...a),
        warn:  (...a) =>        console.warn(tag, ...a),
        error: (...a) =>        console.error(tag, ...a),
    };
}
