const bs58check = require('bs58check')
const sodium = require('libsodium-wrappers')

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
    this.block_pointer = 'prevalidation'
    this.key_pair = {
      public_key_hash: params.public_key_hash,
      public_key: params.public_key,
      secret_key: params.secret_key
    }

    if (params.seed) {
      const seed_raw = TZClient.dec58(prefix.secret_key, params.seed)
      const key_pair = sodium.crypto_sign_seed_keypair(seed_raw)
      this.key_pair.public_key = TZClient.enc58(prefix.public_key, key_pair.publicKey)
      this.key_pair.secret_key = TZClient.enc58(prefix.secret_key, key_pair.privateKey)
      this.key_pair.public_key_hash = TZClient.enc58(prefix.identity, sodium.crypto_generichash(20, key_pair.publicKey))
    }
  }

  static enc58(prefix, input) {
    return bs58check.encode(combineUint8Array(prefix, input))
  }

  static dec58(prefix, input) {
    return bs58check.decode(input).slice(prefix.length)
  }

  static r2tz(input) {
    return Math.round(input * 1000000)
  }
  static tz2r(input) {
    return (input / 1000000).toFixed(6)
  }


  call(path, data = {}) {
    return RPCall(this.host + path, data)
  }

  head() {
    return this.call('/blocks/head')
  }

  balance(key_hash) {
    return this.call(`/blocks/${this.block_pointer}/proto/context/contracts/${key_hash || this.key_pair.public_key_hash}/balance`)
    .then(x => x.balance)
  }

  counter(key_hash) {
    return this.call(`/blocks/prevalidation/proto/context/contracts/${key_hash || this.key_pair.public_key_hash}/counter`)
    .then(x => x.counter)
  }

  script(key_hash) {
    return this.call(`/blocks/${this.block_pointer}/proto/context/contracts/${key_hash}/script`)
  }

  // originate({
  //   fee = 0,
  //   amount = 0,
  //   balance = 0
  // }) {
  //   return Promise.all([this.head(), this.counter()])
  //   .then(([head, counter]) => {
  //     const post_data = {
  //       branch: head.predecessor,
  //       kind: 'manager',
  //       source: this.key_pair.public_key_hash,
  //       fee: TZClient.r2tz(fee),
  //       counter: counter + 1,
  //       operations: [
  //         {
  //           kind: 'origination',
  //           managerPubkey: this.key_pair.public_key,
  //           balance: TZClient.r2tz(balance),
  //         }
  //       ]
  //     }

  //     return this.call(`/blocks/prevalidation/proto/helpers/forge/forge/operations`, post_data)
  //     .then(x => {
  //       const post_data = {
  //         pred_block: head.predecessor,
  //         operation_hash: TZClient.enc58(prefix.operation, sodium.crypto_generichash(32, x.operation)),
  //         forged_operation: x.operation,
  //         signature: TZClient.enc58(prefix.signature, sodium.crypto_sign_detached(x.operation, TZClient.dec58(prefix.secret_key, this.key_pair.secret_key)))
  //       }

  //       return this.call(`/blocks/prevalidation/proto/helpers/apply_operation`, post_data)
  //     })
  //   })
  //   .then(x => console.log(x))
  //   .catch(err => console.log(err))
  // }

  transfer({
    fee = 0,
    amount = 0,
    destination,
    parameters
  }) {
    return Promise.all([this.head(), this.counter()])
    .then(([head, counter]) => {
      const post_data = {
        branch: head.predecessor,
        kind: 'manager',
        source: this.key_pair.public_key_hash,
        fee: TZClient.r2tz(fee),
        counter: counter + 1,
        operations: [
          {
            kind: 'transaction',
            amount: TZClient.r2tz(amount),
            destination,
            parameters
          }
        ]
      }

      return this.call(`/blocks/prevalidation/proto/helpers/forge/forge/operations`, post_data)
      .then(x => {
        const sig = sodium.crypto_sign_detached(sodium.from_hex(x.operation), TZClient.dec58(prefix.secret_key, this.key_pair.secret_key))
        const signed_operation = x.operation + sodium.to_hex(sig)

        const post_data = {
          pred_block: head.predecessor,
          operation_hash: TZClient.enc58(prefix.operation, sodium.crypto_generichash(32, x.operation)),
          forged_operation: x.operation,
          signature: TZClient.enc58(prefix.signature, sig)
        }

        return Promise.all([this.call(`/blocks/prevalidation/proto/helpers/apply_operation`, post_data), signed_operation])
      })
    })
    .then(([x, signed_operation]) => {
      const post_data = {
        signedOperationContents: signed_operation
      }
      return this.call('/inject_operation', post_data)
    })
    .then(x => x.injectedOperation)
    .catch(err => console.log(err))
  }
}

sodium.ready.then(() => {

  const tzc = new TZClient({
    seed: 'edsk3iQYm63d83jdgNpciMAKW1tgUyr2uJDJESAwbADhg8LTdumoF9'
  })

  tzc.transfer({
    destination: 'tz1fEYqu5SjJ8z22Y7U5vVqrJTsGJcv8dy1r',
    amount: 135.325732
  })
  .then(x => console.log(x))
  .then(() => {
    return tzc.balance('tz1fEYqu5SjJ8z22Y7U5vVqrJTsGJcv8dy1r')
  })
  .then(x => console.log(x))
  .catch(err => console.log(err))

})
