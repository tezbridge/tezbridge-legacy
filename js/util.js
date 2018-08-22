const getLocal = x => JSON.parse(window.localStorage.getItem(x))
const setLocal = (x, y) => window.localStorage.setItem(x, JSON.stringify(y))
const removeLocal = x => window.localStorage.removeItem(x)

const devtoolsDetectListen = (() => {
  const log = console.log
  let v = false
  const r = /./
  r.toString = () => {
    v = !v
  }
  const functions = new Set()

  const settings = getLocal('*')

  if (settings && settings.detect_devtools)
    setInterval(() => {
      const prev = v
      log('%c', r)
      const result = v !== prev
      if (result && functions.size) {
        functions.forEach(x => x())
        functions.clear()
      }
    }, 500)

  return (fn) => {
    functions.add(fn)
  }
})()

const host = 'https://mainnet.tezbridge.com'

function base(u){for(var h={},i=u.length,g=u.charAt(0),r=0;r<u.length;r++){var e=u.charAt(r);if(void 0!==h[e])throw new TypeError(e+" is ambiguous");h[e]=r}function n(r){if("string"!=typeof r)throw new TypeError("Expected String");if(0===r.length)return Buffer.allocUnsafe(0);for(var e=[0],n=0;n<r.length;n++){var t=h[r[n]];if(void 0===t)return;for(var o=0,f=t;o<e.length;++o)f+=e[o]*i,e[o]=255&f,f>>=8;for(;0<f;)e.push(255&f),f>>=8}for(var a=0;r[a]===g&&a<r.length-1;++a)e.push(0);return Buffer.from(e.reverse())}return{encode:function(r){if(0===r.length)return"";for(var e=[0],n=0;n<r.length;++n){for(var t=0,o=r[n];t<e.length;++t)o+=e[t]<<8,e[t]=o%i,o=o/i|0;for(;0<o;)e.push(o%i),o=o/i|0}for(var f="",a=0;0===r[a]&&a<r.length-1;++a)f+=g;for(var h=e.length-1;0<=h;--h)f+=u[e[h]];return f},decodeUnsafe:n,decode:function(r){var e=n(r);if(e)return e;throw new Error("Non-base"+i+" character")}}}

module.exports = {
  G: {
    tzclient: null
  },
  devtoolsDetectListen,
  getLocal,
  setLocal,
  removeLocal,
  host,
  pako: window.pako,
  base: base('1234567890qazwsxedcrfvtgbyhnujmikolpQAZWSXEDCRFVTGBYHNUJMIKOLP$-_.+!*,')
}