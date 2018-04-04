(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
((window) => {
  const TZClient = window.TZClient

  const getLocal = x => JSON.parse(window.localStorage.getItem(x))
  const removeLocal = x => window.localStorage.removeItem(x)

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
            source: e.data.source,
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
${e.data.operations.map(x => x.method + (x.destination ? `(${x.destination})` : '') + ' with ' + (x.amount || x.balance) + 'tz').join('\n')}`
      },
      handler(e) {
        return rpc(() => {
          const ops = e.data.operations
          .filter(x => x.method === 'transfer' || x.method === 'originate')
          .map(x => {
            if (x.method === 'transfer') {
              return tzclient.transfer({
                amount: x.amount,
                source: x.source,
                destination: x.destination,
                parameters: x.parameters
              }, true)
            } else {
              return tzclient.originate({
                balance: x.balance,
                spendable: !!x.spendable,
                delegatable: !!x.delegatable,
                script: x.script,
                delegate: x.delegate
              }, true)
            }
          })
          return tzclient.makeOperations([{
            kind: 'reveal',
            public_key: tzclient.key_pair.public_key
          }].concat(ops), 0, e.data.source && {source: e.data.source})
          .then(x => ({result: x}))
        })
      }
    }
  }

  const dispatcher = (e) => {
    if (!e.data.tezbridge) return

    const host = getLocal('*').host
    if (host)
      tzclient.host = host

    if (!tzclient.key_pair.secret_key) {
      const encrypted_keys = getLocal('__')
      removeLocal('__')
      if (!encrypted_keys) {
        e.source.postMessage({tezbridge: e.data.tezbridge, error: 'no account found'}, '*')
        alert('CurrentHost:[' + window.location.host + ']\nAccount is inaccessible\nPlease get your access code')

        window.open('https://tezbridge.github.io/')

      } else {
        const key = prompt('Input the access code')
        tzclient.importCipherData(encrypted_keys, key)
        .then(() => {
          if (getLocal('*').timeout) {
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
      if (!export_functions[e.data.method].mute || !getLocal('*').mute)
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
},{}]},{},[1]);
