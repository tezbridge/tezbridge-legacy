(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
((window) => {
  const TZClient = window.TZClient

  const getLocal = x => JSON.parse(window.localStorage.getItem(x))
  const removeLocal = x => window.localStorage.removeItem(x)

  const tzclient_worker = new Worker('js/build/tzclient.js')
  const tzclient_pm = (() => {
    let id = 1
    const resolves = {}
    const rejects = {}
    tzclient_worker.onmessage = e => {
      if (e.data.tezbridge_workerid) {
        if (e.data.error)
          rejects[e.data.tezbridge_workerid] && rejects[e.data.tezbridge_workerid](e.data.error)
        else
          resolves[e.data.tezbridge_workerid] && resolves[e.data.tezbridge_workerid](e.data.result)

        delete resolves[e.data.tezbridge_workerid]
        delete rejects[e.data.tezbridge_workerid]
      }
    }

    return (method, params) => {
      const mid = id++
      tzclient_worker.postMessage({tezbridge_workerid: mid, method, params})
      return new Promise((resolve, reject) => {
        resolves[mid] = resolve
        rejects[mid] = reject
      })
    }
  })()

  const export_functions = {
    public_key_hash: {
      mute: true,
      confirm(e) {
        return `get public key hash`
      },
      handler(e) {
        return tzclient_pm('public_key_hash')
      }
    },
    balance: {
      mute: true,
      confirm(e) {
        return `get balance`
      },
      handler(e) {
        return tzclient_pm('balance', e.data.contract)
          .then(x => TZClient.tz2r(x))
      }
    },
    block_head: {
      mute: true,
      confirm(e) {
        return `get block head of node`
      },
      handler(e) {
        return tzclient_pm('head')
      }
    },
    contract: {
      mute: true,
      confirm(e) {
        return `get info for contract:${e.data.contract}`
      },
      handler(e) {
        return tzclient_pm('contract', e.data.contract)
      }
    },
    transfer: {
      confirm(e) {
        return `transfer ${e.data.amount}tz to ${e.data.destination} with parameter
${(e.data.parameters && JSON.stringify(e.data.parameters)) || 'Unit'}`
      },
      handler(e) {
        return tzclient_pm('transfer', {
          amount: e.data.amount,
          source: e.data.source,
          destination: e.data.destination,
          parameters: e.data.parameters
        })
      }
    },
    originate: {
      confirm(e) {
        return `originate contract for ${e.data.balance}tz
with code:${!!e.data.script}`
      },
      handler(e) {
        return tzclient_pm('originate', {
          source: e.data.source,
          balance: e.data.balance,
          spendable: !!e.data.spendable,
          delegatable: !!e.data.delegatable,
          script: e.data.script,
          delegate: e.data.delegate
        })
      }
    },
    operations: {
      confirm(e) {
        return `run operations list below:
${e.data.operations.map(x => x.method + (x.destination ? `(${x.destination})` : '') + ' with ' + (x.amount || x.balance) + 'tz').join('\n')}`
      },
      handler(e) {
        const ops = e.data.operations.filter(x => x.method === 'transfer' || x.method === 'originate')
        return tzclient_pm('makeOperations', [ops, 0, e.data.source && {source: e.data.source}])
      }
    }
  }

  const dispatcher = (e) => {
    if (!e.data.tezbridge) return
    const origin = e.origin

    const host = getLocal('*').host
    if (host)
      tzclient_pm('setHost', host)

    tzclient_pm('public_key_hash')
    .then(x => {
      if (!x) {
        const encrypted_keys = getLocal('__')
        removeLocal('__')
        if (!encrypted_keys) {
          e.source.postMessage({tezbridge: e.data.tezbridge, error: 'no account found'}, origin)
          alert('CurrentHost:[' + window.location.host + ']\nAccount is inaccessible\nPlease get your access code')

          window.open('https://tezbridge.github.io/')

        } else {
          const key = prompt('Input the access code')
          tzclient_pm('importCipherData', [encrypted_keys, key])
          .then(() => {
            if (getLocal('*').timeout) {
              const start_date = +new Date()

              const timer = setInterval(() => {
                if (new Date() - start_date >= 1000 * 60 * 30) {
                  reset()
                }
              }, 5000)

              const reset = () => {
                tzclient_pm('cleanKey')
                clearInterval(timer)
              }
            }

            dispatcher(e)
          })
          .catch(() => {
            e.source.postMessage({tezbridge: e.data.tezbridge, error: 'Decryption failed'}, origin)
          })
        }
      } else {
        if (!export_functions[e.data.method]) return
        if (!export_functions[e.data.method].mute || !getLocal('*').mute)
          if (!confirm(`Allow ${e.origin} to \n${export_functions[e.data.method].confirm(e)}`)) {
            e.source.postMessage({tezbridge: e.data.tezbridge, error: 'unpass confirmation'}, origin)
            return
          }

        const p = export_functions[e.data.method].handler(e)
        if (p)
          p.then(x => {
            const result = {result: x}
            result.tezbridge = e.data.tezbridge
            e.source.postMessage(result, origin)
          })
          .catch(err => {
            e.source.postMessage({tezbridge: e.data.tezbridge, error: err}, origin)
          })
      }
    })
  }

  const main = () => {
    window.addEventListener('message', dispatcher)
  }
  main()
})(window)
},{}]},{},[1]);
