(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
// const sodium = require('libsodium-wrappers')

const to_hex = input => {
  return [].map.call(input, x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const from_hex = input => {
  return new Uint8Array(input.match(/[a-z0-9]{2}/g).map(x => parseInt(x, 16)))
}

const to_base64 = x => {
  return btoa(String.fromCharCode.apply(null, x))
}

const getKey = (password, salt) => {
  // return Promise.resolve(sodium.crypto_pwhash(
  //   64,
  //   password,
  //   salt,
  //   4,
  //   1024 * 2048,
  //   sodium.crypto_pwhash_ALG_ARGON2I13
  // ))
  return argon2.hash({
      pass: password,
      salt: salt,
      time: 4,
      mem: 2048,
      hashLen: 64,
      parallelism: 1,
      type: argon2.ArgonType.Argon2i,
      distPath: './js'
  })
  .then(x => x.hash)
}

const encrypt = (password, content) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(16))

  return getKey(password, salt)
  .then(key => miscreant.AEAD.importKey(key, 'AES-PMAC-SIV'))
  .then(x => x.seal(new TextEncoder('utf-8').encode(content), iv))
  .then(x => ({
    v: 0.31,
    salt: to_hex(salt),
    iv: to_hex(iv),
    ciphertext: to_hex(x)
  }))
}

const decrypt = (password, cipherobj) => {
  if (cipherobj.v !== 0.31) {
    alert('The crypto system has been updated\nPlease clear your account and reimport it again')
    return Promise.reject()
  }

  const salt = from_hex(cipherobj.salt)
  const iv = from_hex(cipherobj.iv)
  const ciphertext = from_hex(cipherobj.ciphertext)

  return getKey(password, salt)
  .then(key => miscreant.AEAD.importKey(key, 'AES-PMAC-SIV'))
  .then(x => x.open(ciphertext, iv))
  .then(x => new TextDecoder('utf-8').decode(x))
}

module.exports = {
  encrypt,
  decrypt,
  to_base64
}

},{}],2:[function(require,module,exports){
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
                ${e.data.operations.map(x => x.kind + ' with ' + (x.amount || x.balance) + 'tz\n')}`
      },
      handler(e) {
        return rpc(() => {
          const ops = e.data.operations.filter(x => x.kind === 'transaction' || x.kind === 'originate')
          return tzclient.makeOperations([{
            kind: 'reveal',
            public_key: this.key_pair.public_key
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
},{"./crypto":1}]},{},[2]);
