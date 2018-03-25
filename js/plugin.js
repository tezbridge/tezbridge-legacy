((window) => {
  const TZClient = window.TZClient

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

  const tzclient = new TZClient()

  const export_functions = {
    public_key_hash: {
      mute: true,
      confirm(e) {
        return `get public key hash`
      },
      handler(e) {
        return Promise.resolve({result: tzclient.key_pair.public_key_hash})
      }
    },
    balance: {
      mute: true,
      confirm(e) {
        return `get balance`
      },
      handler(e) {
        return rpc(() =>
          tzclient.balance(e.data.contract)
          .then(x => ({result: TZClient.tz2r(x)}))
        )
      }
    },
    block_head: {
      mute: true,
      confirm(e) {
        return `get block head of node`
      },
      handler(e) {
        return rpc(() => tzclient.head().then(x => ({result: x})))
      }
    },
    contract: {
      mute: true,
      confirm(e) {
        return `get info for contract:${e.data.contract}`
      },
      handler(e) {
        return rpc(() =>
          tzclient.contract(e.data.contract)
          .then(x => ({result: x}))
        )
      }
    },
    transfer: {
      confirm(e) {
        return `transfer ${e.data.amount}tz to ${e.data.destination} with parameter
${(e.data.parameters && JSON.stringify(e.data.parameters)) || 'Unit'}`
      },
      handler(e) {
        return rpc(() =>
          tzclient.transfer({
            amount: e.data.amount,
            source: e.data.source,
            destination: e.data.destination,
            parameters: e.data.parameters
          })
          .then(x => ({result: x}))
        )
      }
    },
    originate: {
      confirm(e) {
        return `originate contract for ${e.data.balance}tz
with code:${!!e.data.script}`
      },
      handler(e) {
        return rpc(() => {
          return tzclient.originate({
            balance: e.data.balance,
            spendable: !!e.data.spendable,
            delegatable: !!e.data.delegatable,
            script: e.data.script,
            delegate: e.data.delegate
          })
          .then(x => ({result: x}))
        })
      }
    },
    operations: {
      confirm(e) {
        return `run operations list below:
${e.data.operations.map(x => x.kind + (x.destination ? `(${x.destination})` : '') + ' with ' + (x.amount || x.balance) + 'tz').join('\n')}`
      },
      handler(e) {
        return rpc(() => {
          const ops = e.data.operations
          .filter(x => x.kind === 'transaction' || x.kind === 'originate')
          .map(x => {
            if (x.amount)
              x.amount = TZClient.r2tz(x.amount)

            if (x.balance)
              x.balance = TZClient.r2tz(x.balance)

            return x
          })
          return tzclient.makeOperations([{
            kind: 'reveal',
            public_key: tzclient.key_pair.public_key
          }].concat(ops), 0)
          .then(x => ({result: x}))
        })
      }
    }
  }

  const dispatcher = (e) => {
    if (!e.data.tezbridge) return

    const host = getLocal('host')
    if (host)
      tzclient.host = host

    if (!tzclient.key_pair.secret_key) {
      const encrypted_keys = getLocal('__')
      setLocal('__', '')
      if (!encrypted_keys) {
        e.source.postMessage({tezbridge: e.data.tezbridge, error: 'no account found'}, '*')
        alert('CurrentHost:[' + window.location.host + ']\nAccount is inaccessible\nPlease get your access code')

        window.open('https://tezbridge.github.io/')

      } else {
        const key = prompt('Input the access code')
        require('./crypto').decrypt(key, JSON.parse(encrypted_keys))
        .then(x => {
          tzclient.importKey({secret_key: x})

          if (getLocal('timeout')) {
            const start_date = +new Date()

            const timer = setInterval(() => {
              if (new Date() - start_date >= 1000 * 60 * 30) {
                reset()
              }
            }, 5000)

            const reset = () => {
              tzclient.key_pair = {}
              clearInterval(timer)
            }
          }

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