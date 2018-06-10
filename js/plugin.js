((window) => {
  const util = require('./util')
  const TZClient = window.TZClient

  const getLocal = util.getLocal
  const removeLocal = util.removeLocal

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
      const p = new Promise((resolve, reject) => {
        resolves[mid] = resolve
        rejects[mid] = reject
      })
      tzclient_worker.postMessage({tezbridge_workerid: mid, method, params})
      return p
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
    hash_data: {
      mute: true,
      confirm(e) {
        return `hash data`
      },
      handler(e) {
        return tzclient_pm('hash_data', {
          data: e.data.data,
          type: e.data.type  
        })
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
${e.data.operations.map(x => x.method + (x.destination ? `(${x.destination})` : '') + ' with ' + (x.amount || x.balance || 0) + 'tz').join('\n')}`
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

    const settings = getLocal('*')
    const host = settings ? settings.host : ''
    if (host)
      tzclient_pm('setHost', host)

    tzclient_pm('public_key_hash')
    .then(x => {
      if (!x) {
        const encrypted_keys = getLocal('__')
        removeLocal('__')
        if (!encrypted_keys) {
          e.source.postMessage({tezbridge: e.data.tezbridge, error: 'Account is inaccessible'}, origin)

          if (!(e.data.method === 'public_key_hash' && e.data.noalert)) {
            alert('Account is inaccessible\nPlease get your access code from [https://www.tezbridge.com/]')
          }

        } else {
          const key = prompt('Input the access code')
          tzclient_pm('importCipherData', [encrypted_keys, key])
          .then(() => {
            const relock = getLocal('*').relock || 0
            if (relock) {
              const start_date = +new Date()

              const timer = setInterval(() => {
                if (new Date() - start_date >= 1000 * 60 * relock) {
                  reset()
                }
              }, 5000)

              const reset = () => {
                tzclient_pm('cleanKey')
                clearInterval(timer)
              }
            }

            util.devtoolsDetectListen(() => {
              tzclient_pm('cleanKey')
            })

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