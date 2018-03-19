const RPCall = (url, data) => {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.addEventListener("load", resolve)
    req.addEventListener("error", reject)
    req.addEventListener("abort", reject)
    req.open('POST', url)
    req.send(typeof data === 'object' ? JSON.stringify(data) : data)
  })
  .then(pe => JSON.parse(pe.target.responseText))
}

class TZClient {
  constructor(params = {}) {
    this.host = params.host || 'https://zeronet.catsigma.com'
  }

  call(path, data = {}) {
    return RPCall(this.host + path, data)
  }
}

const tzc = new TZClient()
tzc.call('/blocks/head')
.then(x => console.log(x))
.catch(err => console.log(err))
