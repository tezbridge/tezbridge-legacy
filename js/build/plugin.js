(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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
  return argon2.hash({
      pass: password,
      salt: salt,
      time: 8,
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
    v: 0.23,
    salt: to_hex(salt),
    iv: to_hex(iv),
    ciphertext: to_hex(x)
  }))
}

const decrypt = (password, cipherobj) => {
  if (cipherobj.v !== 0.23) {
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
        alert('CurrentHostname:[' + window.location.hostname + ']\nAccount is inaccessible\nPlease get your access code')

        window.open('https://tezbridge.github.io/')

      } else {
        const key = prompt('Input the access code')
        require('./crypto').decrypt(key, JSON.parse(encrypted_keys))
        .then(x => {
          keys = JSON.parse(x)

          if (getLocal('plugin_timeout')) {
            const start_date = +new Date()

            const timer = setInterval(() => {
              if (new Date() - start_date >= 1000 * 60 * 30) {
                reset()
              }
            }, 5000)

            const reset = () => {
              keys = {}
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
