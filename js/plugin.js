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
    get_block_head: {
      mute: true,
      confirm(e) {
        return `get block head of node`
      },
      handler(e) {
        return rpc(() => eztz.rpc.getHead().then(x => ({result: x})))
      }
    },
    get_contract_info: {
      mute: true,
      confirm(e) {
        return `get info for contract:${e.data.contract}`
      },
      handler(e) {
        return rpc(() =>
          new Promise(function (resolve, reject) {
            eztz.node.query("/blocks/head/proto/context/contracts/" + e.data.contract).then(function(r){
              resolve(r)
            }).catch(function(e){
              reject(e)
            })
          })
          .then(x => ({result: x}))
          )
      }
    },
    transfer: {
      confirm(e) {
        return `transfer ${e.data.amount} to ${e.data.destination} with parameter
          ${(e.data.parameters && JSON.stringify(e.data.parameters)) || 'Unit'}`
      },
      handler(e) {
        return rpc(() =>
          eztz.rpc.sendOperation({
            "kind": "transaction",
            "amount": Math.round(parseFloat(e.data.amount).toFixed(2) * 100),
            "destination": e.data.destination,
            "parameters": e.data.parameters || 'Unit'
          }, {pk: keys.pk, pkh: e.data.pkh || keys.pkh, sk: keys.sk}, 0)
          .then(x => ({result: x}))
          )
      }
    },
    originate: {
      confirm(e) {
        return `originate contract for ${e.data.amount}tz
          with code:${!!e.data.script || !!e.data.code_raw}
          with init:${!!e.data.init_raw}`
      },
      handler(e) {
        return rpc(() => {
          const script = e.data.script || {
            code: e.data.code_raw && eztz.utility.mlraw2json(e.data.code_raw),
            storage: e.data.init_raw && utility.ml2tzjson(e.data.init_raw)
          }

          return eztz.rpc.sendOperation({
            "kind": "origination",
            "balance": Math.round(parseFloat(e.data.amount).toFixed(2) * 100),
            "managerPubkey": keys.pkh,
            "script": script,
            "spendable": (typeof e.data.spendable != "undefined" ? e.data.spendable : false),
            "delegatable": (typeof e.data.delegatable != "undefined" ? e.data.delegatable : false),
            "delegate": e.data.delegate
          }, {pk: keys.pk, pkh: e.data.pkh || keys.pkh, sk: keys.sk}, 0)
          .then(x => ({result: x}))
        })
      }
    }
  }

  const dispatcher = (e) => {
    if (!e.data.tezbridge) return

    const host = getLocal('host')
    if (host)
      eztz.node.setProvider(host)

    if (!keys.sk) {
      const encrypted_keys = getLocal('__')
      setLocal('__', '')
      if (!encrypted_keys) {
        e.source.postMessage({tezbridge: e.data.tezbridge, error: 'no account found'}, '*')
        alert('Account is inaccessible\nPlease get your access code')

        window.open('https://tezbridge.github.io/')

      } else {
        const key = prompt('Input the access code of [tezbridge.github.io]')
        window.localcrypto.decrypt(key, JSON.parse(encrypted_keys))
        .then(x => {
          keys = JSON.parse(x)

          setTimeout(() => {
            keys = {}
          }, 1000 * 20)

          dispatcher(e)
        })
        .catch(() => {
          e.source.postMessage({tezbridge: e.data.tezbridge, error: 'Decryption failed'}, '*')
        })
      }
    } else {
      if (!export_functions[e.data.method]) return
      if (!export_functions[e.data.method].mute || !getLocal('mute'))
        if (!confirm(`Allow ${e.origin} to \n${export_functions[e.data.method].confirm(e)}`)) {
          e.source.postMessage({tezbridge: e.data.tezbridge, error: 'unpass confirmation'}, '*')
          return
        }

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
    window.addEventListener('message', dispatcher)
  }
  main()
})(window)