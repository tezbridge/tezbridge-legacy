const RPCall = (url, data, method) => {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.addEventListener('load', pe => {
      if (req.status === 200)
        resolve(JSON.parse(pe.target.responseText))
      else
        reject(pe.target.responseText)
    })
    req.addEventListener('error', reject)
    req.addEventListener('abort', reject)
    req.open(method, url)
    if (method === 'POST') {
      req.setRequestHeader('Content-Type', 'application/json')
    }
    req.send(JSON.stringify(data))
  })
}

module.exports = {
  combineUint8Array(x, y) {
    const tmp = new Uint8Array(x.length + y.length)
    tmp.set(x, 0)
    tmp.set(y, x.length)
    return tmp
  },
  prefix: {
    contract: new Uint8Array([2,90,121]),
    identity: new Uint8Array([6, 161, 159]),
    public_key: new Uint8Array([13, 15, 37, 217]),
    secret_key: new Uint8Array([43, 246, 78, 7]),
    edesk: new Uint8Array([7,90,60,179,41]),
    signature: new Uint8Array([9, 245, 205, 134, 18]),
    operation: new Uint8Array([5, 116])
  },
  mark: {
    operation: new Uint8Array([3])
  },
  enc58(prefix, input) {
    return bs58check.encode(combineUint8Array(prefix, input))
  },
  dec58(prefix, input) {
    return bs58check.decode(input).slice(prefix.length)
  },
  r2tz(input) {
    return '' + Math.round(input * 1000000)
  },
  tz2r(input) {
    return input / 1000000 + ''
  },
  get(path, data = {}) {
    return RPCall(path, data, 'GET')
  },
  post(path, data = {}) {
    return RPCall(path, data, 'POST')
  }
}