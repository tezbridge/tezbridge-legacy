const getLocal = x => JSON.parse(window.localStorage.getItem(x))
const setLocal = (x, y) => window.localStorage.setItem(x, JSON.stringify(y))
const removeLocal = x => window.localStorage.removeItem(x)

const devtoolsDetectListen = (() => {
  let v = false
  const r = /./
  r.toString = () => {
    v = !v
  }
  const functions = new Set()

  const settings = getLocal('*')

  if (settings.detect_devtools)
    setInterval(() => {
      const prev = v
      console.log('%c', r)
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


module.exports = {
  devtoolsDetectListen,
  getLocal,
  setLocal,
  removeLocal
}