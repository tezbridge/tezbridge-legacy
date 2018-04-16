
const bs58check = require('bs58check')
const sodium = require('libsodium-wrappers')
const bip39 = require('bip39')
const localcrypto = require('./localcrypto')

const combineUint8Array = (x, y) => {
  const tmp = new Uint8Array(x.length + y.length)
  tmp.set(x, 0)
  tmp.set(y, x.length)
  return tmp
}

const RPCall = (url, data) => {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.addEventListener('load', resolve)
    req.addEventListener('error', reject)
    req.addEventListener('abort', reject)
    req.open('POST', url)
    req.send(typeof data === 'object' ? JSON.stringify(data) : data)
  })
  .then(pe => JSON.parse(pe.target.responseText))
}

const prefix = {
  identity: new Uint8Array([6, 161, 159]),
  public_key: new Uint8Array([13, 15, 37, 217]),
  secret_key: new Uint8Array([43, 246, 78, 7]),
  signature: new Uint8Array([9, 245, 205, 134, 18]),
  operation: new Uint8Array([5, 116])
}

class TZClient {
  constructor(params = {}) {
    this.host = params.host || 'https://zeronet.catsigma.com'
    this.importKey(params)
  }

  static enc58(prefix, input) {
    return bs58check.encode(combineUint8Array(prefix, input))
  }

  static dec58(prefix, input) {
    return bs58check.decode(input).slice(prefix.length)
  }

  static r2tz(input) {
    return '' + Math.round(input * 1000000)
  }
  static tz2r(input) {
    return input / 1000000 + ''
  }

  static getKeysFromSeed(seed) {
    const seed_raw = TZClient.dec58(prefix.secret_key, seed)
    const key_pair = sodium.crypto_sign_seed_keypair(seed_raw)
    return {
      public_key: TZClient.enc58(prefix.public_key, key_pair.publicKey),
      secret_key: TZClient.enc58(prefix.secret_key, key_pair.privateKey),
      public_key_hash: TZClient.enc58(prefix.identity, sodium.crypto_generichash(20, key_pair.publicKey))
    }
  }

  static genMnemonic() {
    return bip39.generateMnemonic()
  }

  static getSeedFromMnemonic(mnemonic, password) {
    return TZClient.enc58(prefix.secret_key, bip39.mnemonicToSeed(mnemonic, password).slice(0, 32))
  }

  importKey(params) {
    this.key_pair = {}

    if (params.seed) {
      this.key_pair = TZClient.getKeysFromSeed(params.seed)
    }

    if (params.mnemonic && params.password) {
      this.key_pair = TZClient.getKeysFromSeed(TZClient.getSeedFromMnemonic(params.mnemonic, params.password))
    }

    if (params.secret_key) {
      const raw_public_key = TZClient.dec58(prefix.secret_key, params.secret_key).slice(32)
      this.key_pair = {
        secret_key: params.secret_key,
        public_key: TZClient.enc58(prefix.public_key, raw_public_key),
        public_key_hash: TZClient.enc58(prefix.identity, sodium.crypto_generichash(20, raw_public_key))
      }
    }
  }

  exportCipherData(password) {
    return localcrypto.encrypt(password, this.key_pair.secret_key)
  }

  importCipherData(cipherdata, password) {
    return localcrypto.decrypt(password, cipherdata).then(x => {
      this.importKey({secret_key: x})
      return true
    })
  }

  call(path, data = {}) {
    return RPCall(this.host + path, data)
  }

  predecessor() {
    return this.call('/blocks/prevalidation/predecessor')
    .then(x => x.predecessor)
  }

  prevalidation() {
    return this.call('/blocks/prevalidation')
  }

  head() {
    return this.call('/blocks/head')
  }

  balance(key_hash) {
    return this.call(`/blocks/prevalidation/proto/context/contracts/${key_hash || this.key_pair.public_key_hash}/balance`)
    .then(x => x.balance)
  }

  counter(key_hash) {
    return this.call(`/blocks/prevalidation/proto/context/contracts/${key_hash || this.key_pair.public_key_hash}/counter`)
    .then(x => x.counter)
  }

  contract(key_hash) {
    return this.call(`/blocks/prevalidation/proto/context/contracts/${key_hash}`)
  }

  originate({
    fee = 0,
    balance = 0,
    spendable = false,
    delegatable = false,
    delegate,
    source,
    script
  }, only_return_op = false) {
    const op = {
      kind: 'origination',
      managerPubkey: this.key_pair.public_key_hash,
      balance: TZClient.r2tz(balance),
      spendable,
      delegatable,
      delegate,
      script
    }

    if (only_return_op)
      return op
    else
      return this.makeOperations([{
        kind: 'reveal',
        public_key: this.key_pair.public_key
      }, op], fee, source && {source})
  }

  transfer({
    fee = 0,
    amount = 0,
    source,
    destination,
    parameters
  }, only_return_op = false) {
    const op = {
      kind: 'transaction',
      amount: TZClient.r2tz(amount),
      destination,
      parameters
    }

    if (only_return_op)
      return op
    else
      return this.makeOperations([{
        kind: 'reveal',
        public_key: this.key_pair.public_key
      }, op], fee, source && {source})
  }

  faucet() {
    return this.makeOperations([{
      kind: 'faucet',
      id: this.key_pair.public_key_hash,
      nonce: sodium.to_hex(sodium.crypto_generichash(32, '' + new Date() + Math.random()))
    }], 0, {kind: undefined, source: undefined, fee: undefined, counter: undefined}, false)
    .then(x => this.transfer({
      amount: 100000,
      source: x[0][0],
      destination: this.key_pair.public_key_hash
    }))
  }

  makeOperations(ops, fee = 0, additional_forge_data = {}, with_signature = true) {
    return Promise.all([this.predecessor(), this.counter(additional_forge_data.source)])
    .then(([predecessor, counter]) => {
      const post_data = {
        branch: predecessor,
        kind: 'manager',
        source: this.key_pair.public_key_hash,
        fee: TZClient.r2tz(fee),
        counter: counter + 1,
        operations: ops
      }

      return this.call(`/blocks/prevalidation/proto/helpers/forge/operations`, Object.assign(post_data, additional_forge_data))
      .then(x => {
        const sig = sodium.crypto_sign_detached(sodium.from_hex(x.operation), TZClient.dec58(prefix.secret_key, this.key_pair.secret_key))
        const signed_operation = x.operation + sodium.to_hex(sig)

        const post_data = {
          pred_block: predecessor,
          operation_hash: TZClient.enc58(prefix.operation, sodium.crypto_generichash(32, sodium.from_hex(with_signature ? signed_operation : x.operation))),
          forged_operation: x.operation,
          signature: with_signature ? TZClient.enc58(prefix.signature, sig) : undefined
        }

        return Promise.all([
          this.call(`/blocks/prevalidation/proto/helpers/apply_operation`, post_data),
          with_signature ? signed_operation : x.operation
        ])
      })
    })
    .then(([x, signed_operation, chain_id]) => {
      const post_data = {
        signedOperationContents: signed_operation
      }
      return Promise.all([x.contracts, this.call('/inject_operation', post_data)])
    })
    .then(([contracts, x]) => [contracts, x.injectedOperation])
  }
}

TZClient.libs = {
  bs58check,
  sodium,
  bip39,
  localcrypto
}

module.exports = TZClient

;(() => {
  self.importScripts && self.importScripts('miscreant.js')

  const instance = new TZClient()

  const handler = {
    setHost(host) {
      instance.host = host
      return true
    },
    importKey(params) {
      try {
        instance = new TZClient()
        instance.importKey(params)
        return Promise.resolve(true)
      } catch (err) {
        return Promise.reject(false)
      }
    },
    importCipherData(args) {
      return instance.importCipherData.apply(instance, args)
    },
    cleanKey() {
      instance = new TZClient()
      return true
    },
    public_key_hash() {
      return instance.key_pair.public_key_hash
    },
    balance(contract) {
      return instance.balance(contract)
    },
    head() {
      return instance.head()
    },
    contract(contract) {
      return instance.contract(contract)
    },
    transfer(params) {
      return instance.transfer(params)
    },
    originate(params) {
      return instance.originate(params)
    },
    makeOperations(args) {
      args[0] = args[0].map(x => {
        if (x.method === 'transfer') {
          return instance.transfer({
            amount: x.amount,
            source: x.source,
            destination: x.destination,
            parameters: x.parameters
          }, true)
        } else {
          return instance.originate({
            balance: x.balance,
            spendable: !!x.spendable,
            delegatable: !!x.delegatable,
            script: x.script,
            delegate: x.delegate
          }, true)
        }
      })

      const init_op = [{
        kind: 'reveal',
        public_key: instance.key_pair.public_key
      }]
      args[0] = init_op.concat(args[0])
      return instance.makeOperations.apply(instance, args)
    }
  }

  onmessage = (e) => {
    if (!e.data.tezbridge_workerid) return

    const result = handler[e.data.method](e.data.params)

    ;(result instanceof Promise ? result : Promise.resolve(result))
    .then(result => {
      postMessage({tezbridge_workerid: e.data.tezbridge_workerid, result})
    })
    .catch(error => {
      postMessage({tezbridge_workerid: e.data.tezbridge_workerid, error})
    })
  }
})()


// const tzc = new TZClient({
//   seed: 'edsk3iQYm63d83jdgNpciMAKW1tgUyr2uJDJESAwbADhg8LTdumoF9'
// })

// const tzc = new TZClient({
//   mnemonic: TZClient.genMnemonic(),
//   password: 'abcdefg'
// })

// tzc.balance()
// .then(balance => {
//   return tzc.faucet()
//   .then(() => tzc.balance())
//   .then(x => console.log('faucet test:', TZClient.tz2r(x - balance)))
// })
// .then(() => Promise.all([tzc.balance(), tzc.balance('tz1fEYqu5SjJ8z22Y7U5vVqrJTsGJcv8dy1r')]))
// .then(balances => {
//   return tzc.transfer({
//     destination: 'tz1fEYqu5SjJ8z22Y7U5vVqrJTsGJcv8dy1r',
//     amount: 13.001001
//   })
//   .then(() => {
//     return Promise.all([tzc.balance(), tzc.balance('tz1fEYqu5SjJ8z22Y7U5vVqrJTsGJcv8dy1r')])
//     .then(new_balances => {
//       console.log('trransfer test:',TZClient.tz2r(new_balances[0] - balances[0]), TZClient.tz2r(new_balances[1] - balances[1]))
//     })
//   })
// })
// .then(() => {
//   return tzc.originate({
//     balance: 2.01
//   })
//   .then(x => tzc.balance(x[0][0]))
//   .then(x => console.log('originate test:', TZClient.tz2r(x)))
// })

