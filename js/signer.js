const bs58check = require('bs58check')
const sodium = require('./libsodium-wrappers')
const tzutil = require('./tzutil')

class Signer {
  constructor(sk, host) {
    this.sk = sk
    this.host = host
  }

  get(url, data) {
    return tzutil.get(this.host + url, data)
  }

  post(url, data) {
    return tzutil.post(this.host + url, data)
  }

  head_hash() {
    return this.get(`/chains/main/blocks/head/hash`)
  }

  header() {
    return this.get(`/chains/main/blocks/head/header`)
  }

  protocol() {
    return this.header()
    .then(x => x.protocol)
  }

  postOperations(ops) {
    ops = ops.map(x => {
      ['fee', 'balance', 'amount'].forEach(key => {
        if (typeof x[key] === 'number')
          x[key] = tzutil.r2tz(x[key])
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

      return Promise.all([post_data, this.protocol(), this.post(`/chains/main/blocks/head/helpers/forge/operations`, Object.assign(post_data))])
      .then(([op_req, protocol, operation_data]) => {
        const sig = sodium.crypto_sign_detached(sodium.crypto_generichash(32, combineUint8Array(tzutil.mark.operation, sodium.from_hex(operation_data))), dec58(tzutil.prefix.secret_key, this.sk))
        const signed_operation = operation_data + sodium.to_hex(sig)

        op_req.protocol = protocol
        op_req.signature = enc58(tzutil.prefix.signature, sig)

        return Promise.all([
          this.post(`/chains/main/blocks/head/helpers/preapply/operations`, [op_req]),
          signed_operation
        ])
      })
    })
    .then(([x, signed_operation]) => {
      const operation_results = [].concat.apply([], x.map(x => x.contents.map(x => x.metadata.operation_result))).filter(x => x)
      if (operation_results.filter(x => x.status !== 'applied').length)
        return Promise.reject(x)

      const contracts = operation_results.map(x => x.originated_contracts || [])
      return Promise.all([contracts, this.post('/injection/operation', signed_operation)])
    })
    .then(([contracts, x]) => ({
      contracts,
      operation_id: x
    }))
  }

}

module.exports = Signer
