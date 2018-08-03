(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
((window) => {
  const util = require('./util')
  const TZClient = window.TZClient

  const getLocal = util.getLocal
  const removeLocal = util.removeLocal
  const dataClean = x => {
    const clone = JSON.parse(JSON.stringify(x))
    delete clone.tezbridge
    delete clone.method
    return clone
  }

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
    pack_data: {
      mute: true,
      confirm(e) {
        return `pack data`
      },
      handler(e) {
        return tzclient_pm('pack_data', {
          data: e.data.data,
          type: e.data.type  
        })
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
    head_custom: {
      mute: true,
      confirm(e) {
        return `get custom head data`
      },
      handler(e) {
        return tzclient_pm('head_custom', e.data.path)
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
        return tzclient_pm('transfer', dataClean(e.data))
      }
    },
    originate: {
      confirm(e) {
        return `originate contract for ${e.data.balance}tz
with code:${!!e.data.script}`
      },
      handler(e) {
        return tzclient_pm('originate', dataClean(e.data))
      }
    },
    operations: {
      confirm(e) {
        return `run operations list below:
${e.data.operations.map(x => x.method + (x.destination ? `(${x.destination})` : '') + ' with ' + (x.amount || x.balance || 0) + 'tz').join('\n')}`
      },
      handler(e) {
        const op_lst = e.data.operations.filter(x => x.method === 'transfer' || x.method === 'originate')
          .map(x => {
            const kind = x.method === 'transfer' ? 'transaction' : 'origination'
            delete x.method
            return {kind, params: x}
          })
          
        return tzclient_pm('makeOperations', {op_lst, source: e.data.source, no_injection: e.data.no_injection})
      }
    }
  }

  let first_time = true
  const dispatcher = (e) => {
    if (!e.data.tezbridge) return
    const origin = e.origin

    const settings = getLocal('*')
    const host = settings ? settings.host : ''
    if (host)
      tzclient_pm('setHost', host)

    if (first_time && !e.data.noalert) {
      first_time = false

      const encrypted_keys = getLocal('__')
      if (!encrypted_keys) {
        e.source.postMessage({tezbridge: e.data.tezbridge, error: 'Account is inaccessible'}, origin)

        alert('Account is inaccessible\nPlease get your access code from [https://www.tezbridge.com/]')
        window.open('https://www.tezbridge.com/')
        return false
      }
    }

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
},{"./util":2}],2:[function(require,module,exports){
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

module.exports = {
  devtoolsDetectListen,
  getLocal,
  setLocal,
  removeLocal,
  host
}
},{}]},{},[1]);
