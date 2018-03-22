;((window) => {
  let message_id = 1
  let bridge_fn = null
  const resolves = {}
  const rejects = {}

  const createIframe = () => {
    const iframe = document.createElement('iframe')
    iframe.src = 'https://tezbridge.github.io/plugin.html'
    iframe.style.display = 'none'
    iframe.onload = () => {
      bridge_fn = (params) => {
        return new Promise((resolve, reject) => {
          const mid = message_id++
          params.tezbridge = mid
          iframe.contentWindow.postMessage(params, '*')
          resolves[mid] = resolve
          rejects[mid] = reject
        })
      }
    }
    document.body.appendChild(iframe)
  }
  window.addEventListener('message', function(e){
    if (e.data.tezbridge) {
      if (e.data.error)
        rejects[e.data.tezbridge] && rejects[e.data.tezbridge](e.data.error)
      else
        resolves[e.data.tezbridge] && resolves[e.data.tezbridge](e.data.result)

      delete rejects[e.data.tezbridge]
      delete resolves[e.data.tezbridge]
    }
  })

  document.addEventListener('DOMContentLoaded', createIframe)

  window.tezbridge = (params) => {
    return new Promise((resolve, reject) => {
      const wait = () => {
        if (bridge_fn)
          resolve(bridge_fn)
        else
          setTimeout(wait, 300)
      }
      wait()
    })
    .then(x => x(params))
  }
})(window)