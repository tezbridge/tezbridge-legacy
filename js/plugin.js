((window) => {
  const getLocal = x => window.localStorage.getItem(x)
  const setLocal = (x, y) => window.localStorage.setItem(x, y)
  const rpc = function(promise_fn){
    if (rpc.locked) return
    rpc.locked = true
    return promise_fn().then(function(x) {
      rpc.locked = false
      return Promise.resolve(x)
    }).catch(function(err) {
      rpc.locked = false
      return Promise.reject(err)
    })
  }

  let keys = {}

  const export_functions = {
    get_pkh: {
      mute: true,
      confirm(e) {
        return `get public key hash`
      },
      handler(e) {
        return Promise.resolve({result: keys.pkh})
      }
    },
    get_balance: {
      mute: true,
      confirm(e) {
        return `get balance`
      },
      handler(e) {
        return rpc(() =>
          eztz.rpc.getBalance(keys.pkh)
          .then(x => ({result: x}))
          )
      }
    },
    get_contract_info: {
      mute: true,
      confirm(e) {
        return `get info for contract:${e.data.contract}`
      },
      handler(e) {
        return rpc(() =>
          eztz.contract.storage(e.data.contract)
          .then(x => ({result: x}))
          )
      }
    },
    transfer: {
      confirm(e) {
        return `transfer ${e.data.amount} to ${e.data.destination} with parameter {${e.data.parameter || 'Unit'}}`
      },
      handler(e) {
        return rpc(() =>
          eztz.rpc.sendOperation({
            "kind": "transaction",
            "amount": parseInt(e.data.amount), 
            "destination": e.data.destination,
            "parameters": e.data.parameters || 'Unit'
          }, {pk: keys.pk, pkh: keys.pkh, sk: keys.sk}, 0)
          .then(x => ({result: x}))
          )
      }
    }
  }

  const dispatcher = (e) => {
    if (!e.data.tezbridge) return

    if (!keys.sk) {
      const encrypted_keys = getLocal('__')
      setLocal('__', '')
      if (!encrypted_keys) {
        alert('No account is accessible in [tezbridge.github.io], opening...')
        window.open('https://tezbridge.github.io/')
      } else {
        const key = prompt('Input the access code of [tezbridge.github.io]')
        window.localcrypto.decrypt(key, JSON.parse(encrypted_keys), x => {
          keys = JSON.parse(x)
          dispatcher(e)
        })
      }
    } else {
      if (!export_functions[e.data.method]) return
      if (!export_functions[e.data.method].mute || !getLocal('mute'))
        if (!confirm(`Allow ${e.origin} to \n${export_functions[e.data.method].confirm(e)}`)) return

      const p = export_functions[e.data.method].handler(e)
      if (p) 
        p.then(x => {
          x.tezbridge = e.data.tezbridge
          e.source.postMessage(x, '*')
        })
        .catch(function(err){
          e.source.postMessage({tezbridge: e.data.tezbridge, error: err}, '*')
        })
    }
  }

  const main = () => {
    eztz.node.setProvider('https://teznode.catsigma.com')
    window.addEventListener('message', dispatcher)
  }
  main()
})(window)