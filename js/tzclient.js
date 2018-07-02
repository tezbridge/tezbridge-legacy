
const bs58check = require('bs58check')
const sodium = require('./libsodium-wrappers')
const bip39 = require('bip39')
const localcrypto = require('./localcrypto')

const combineUint8Array = (x, y) => {
  const tmp = new Uint8Array(x.length + y.length)
  tmp.set(x, 0)
  tmp.set(y, x.length)
  return tmp
}

const RPCall = (url, data, method) => {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.addEventListener('load', pe => {
      if (req.status === 200)
        resolve(JSON.parse(pe.target.responseText))
      else
        reject(pe.target.responseText)
    })
    req.addEventListener('error', reject)
    req.addEventListener('abort', reject)
    req.open(method, url)
    if (method === 'POST') {
      req.setRequestHeader('Content-Type', 'application/json')
    }
    req.send(JSON.stringify(data))
  })
}

const prefix = {
  identity: new Uint8Array([6, 161, 159]),
  public_key: new Uint8Array([13, 15, 37, 217]),
  secret_key: new Uint8Array([43, 246, 78, 7]),
  signature: new Uint8Array([9, 245, 205, 134, 18]),
  operation: new Uint8Array([5, 116])
}
const mark = {
  operation: new Uint8Array([3])
}

class TZClient {
  constructor(params = {}) {
    this.host = params.host || 'https://mainnet.tezbridge.com'
    this.chain_id = 'main'
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
    return RPCall(this.host + path, data, 'GET')
  }
  post(path, data = {}) {
    return RPCall(this.host + path, data, 'POST')
  }

  predecessor() {
    return this.call(`/chains/${this.chain_id}/blocks/head/header`)
    .then(x => x.predecessor)
  }

  head_hash() {
    return this.call(`/chains/${this.chain_id}/blocks/head/hash`)
  }

  head() {
    return this.call(`/chains/${this.chain_id}/blocks/head`)
  }

  hash_data(data, type) {
    const data_content = {
      string: {string: data}
    }
    const param = {"data": data_content[type] || data,"type":{"prim":type,"args":[]}}
    return this.post(`/chains/${this.chain_id}/blocks/head/helpers/scripts/hash_data`, param)
    .then(x => x.hash)
  }

  balance(key_hash) {
    return this.call(`/chains/${this.chain_id}/blocks/head/context/delegates/${key_hash || this.key_pair.public_key_hash}/balance`)
  }

  counter(key_hash) {
    return this.call(`/chains/${this.chain_id}/blocks/head/context/contracts/${key_hash || this.key_pair.public_key_hash}/counter`)
  }

  counter1(key_hash) {
    return this.counter(key_hash).then(x => parseInt(x) + 1 + '')
  }

  contract(key_hash) {
    return this.call(`/chains/${this.chain_id}/blocks/head/context/contracts/${key_hash}`)
  }

  manager_key(key_hash) {
    return this.call(`/chains/${this.chain_id}/blocks/head/context/contracts/${key_hash || this.key_pair.public_key_hash}/manager_key`)
  }

  createOpJSON(name) {
    const default_op = {
      reveal: {
        kind: "reveal",
        source: this.key_pair.public_key_hash,
        fee: "0",
        gas_limit: "0",
        storage_limit: "0",
        public_key: this.key_pair.public_key
        // counter: $positive_bignum,
      },
      transaction: {
        kind: 'transaction',
        source: this.key_pair.public_key_hash,
        fee: "0",
        gas_limit: "5000",
        storage_limit: "0",
        amount: "0"
        // counter: $positive_bignum,
        // destination: $contract_id,
        // parameters?: $micheline.michelson_v1.expression
      },
      origination: {
        kind: "origination",
        source: this.key_pair.public_key_hash,
        fee: "0",
        // counter: $positive_bignum,
        gas_limit: "0",
        storage_limit: "0",
        managerPubkey: this.key_pair.public_key_hash,
        balance: "0",
        // "spendable"?: boolean,
        // "delegatable"?: boolean,
        // "delegate"?: $Signature.Public_key_hash,
        // "script"?: $scripted.contracts
      }
    }

    const result = default_op[name]
    for (let i = 1; i < arguments.length; i++) {
      Object.assign(result, JSON.parse(JSON.stringify(arguments[i])))
    }

    return result
  }

  makeOpWithReveal(kind, params) {
    return this.counter1(params.source).
      then(counter => {
        return this.manager_key(params.source).then(x => {
          const ops = []
          if (!x.key)
            ops.push(this.createOpJSON('reveal', {counter: counter++ + '', source: params.source}))

          ops.push(this.createOpJSON(kind, params, {counter: counter + ''}))

          return this.makeOperations(ops)
        })
      })
  }

  originate(params) {
    return this.makeOpWithReveal('origination', params)
  }

  transfer(params) {
    if (!params.destination) 
      return Promise.reject('lack of destination when calling transfer')

    return this.makeOpWithReveal('transaction', params)
  }

  activate(secret) {
    return this.makeOperations([{
      kind: 'activate_account',
      secret,
      pkh: this.key_pair.public_key_hash
    }])
  }

  makeOperations(ops) {
    ops = ops.map(x => {
      ['fee', 'balance', 'amount'].forEach(key => {
        if (typeof x[key] === 'number')
          x[key] = TZClient.r2tz(x[key])
      })

      ;['gas_limit', 'storage_limit'].forEach(key => {
        if (typeof x[key] === 'number')
          x[key] = x[key] + ''
      })
      return x
    })

    return this.head_hash()
    .then(head_hash => {
      const post_data = {
        branch: head_hash,
        contents: ops
      }

      return Promise.all([post_data, this.post(`/chains/${this.chain_id}/blocks/head/helpers/forge/operations`, Object.assign(post_data))])
      .then(([op_req, operation_data]) => {
        const sig = sodium.crypto_sign_detached(sodium.crypto_generichash(32, combineUint8Array(mark.operation, sodium.from_hex(operation_data))), TZClient.dec58(prefix.secret_key, this.key_pair.secret_key))
        const signed_operation = operation_data + sodium.to_hex(sig)

        op_req.protocol = 'ProtoALphaALphaALphaALphaALphaALphaALphaALphaDdp3zK'
        op_req.signature = TZClient.enc58(prefix.signature, sig)

        return Promise.all([
          this.post(`/chains/${this.chain_id}/blocks/head/helpers/preapply/operations`, [op_req]),
          signed_operation
        ])
      })
    })
    .then(([x, signed_operation]) => {
      const operation_results = [].concat.apply([], x.map(x => x.contents.map(x => x.metadata.operation_result)))
      if (operation_results.filter(x => x.status === 'failed').length)
        return Promise.reject(x)

      const contracts = [].concat.apply(operation_results.map(x => x.originated_contracts || []))
      return Promise.all([contracts, this.post('/injection/operation', signed_operation)])
    })
    .then(([contracts, x]) => ({
      contracts,
      operation_id: x
    }))
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
  if (!self.importScripts) return false

  self.importScripts('miscreant.js')

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
      instance.key_pair = {}
      return true
    },
    public_key_hash() {
      return instance.key_pair.public_key_hash
    },
    hash_data(param) {
      return instance.hash_data(param.data, param.type)
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
    const result_promise = result instanceof Promise ? result : Promise.resolve(result)

    result_promise.then(result => {
      postMessage({tezbridge_workerid: e.data.tezbridge_workerid, result})
    })
    .catch(error => {
      postMessage({tezbridge_workerid: e.data.tezbridge_workerid, error: error instanceof Error ? error.toString() : error})
    })
  }
})()

