let instance = null

const dataClean = x => {
  const clone = JSON.parse(JSON.stringify(x))
  delete clone.tezbridge
  delete clone.method
  return clone
}

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
  hash_data(packed_data) {
    return instance.hash_data(packed_data)
  },
  pack_data(param) {
    return instance.pack_data(param.data, param.type)
  },
  big_map_with_key(param) {
    return instance.big_map_with_key(param.key, param.contract)
  },
  raw_storage(contract) {
    return instance.raw_storage(contract)
  },
  decode_bytes(bytes_string) {
    return instance.decode_bytes(bytes_string)
  },
  balance(contract) {
    return instance.balance(contract)
  },
  head() {
    return instance.head()
  },
  head_custom(path) {
    return instance.head_custom(path)
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
  makeOperations(params) {
    return instance.makeOpWithReveal(params.source, params.op_lst, params.no_injection)
  }
}

const tzclient_pm = (method, params) => {
  const result = handler[method](params)
  return result instanceof Promise ? result : Promise.resolve(result)
}

const export_functions = {
  public_key_hash: {
    mute: true,
    need_login: true,
    confirm(e) {
      return `get public key hash`
    },
    handler(e) {
      return tzclient_pm('public_key_hash')
    }
  },
  balance: {
    mute: true,
    need_login: true,
    confirm(e) {
      return `get balance`
    },
    handler(e) {
      return tzclient_pm('balance', e.data.contract)
        .then(x => TZClient.tz2r(x))
    }
  },
  big_map_with_key: {
    mute: true,
    need_login: false,
    confirm(e) {
      return `get big_map value by key`
    },
    handler(e) {
      return tzclient_pm('big_map_with_key', {
        key: e.data.key,
        contract: e.data.contract
      })
    }
  },
  raw_storage: {
    mute: true,
    need_login: false,
    confirm(e) {
      return `get big_map and storage data`
    },
    handler(e) {
      return tzclient_pm('raw_storage', e.data.contract)
    }
  },
  decode_bytes: {
    mute: true,
    need_login: false,
    confirm(e) {
      return `decode bytes`
    },
    handler(e) {
      return tzclient_pm('decode_bytes', e.data.bytes)
    }
  },
  pack_data: {
    mute: true,
    need_login: false,
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
    need_login: false,
    confirm(e) {
      return `hash data`
    },
    handler(e) {
      return tzclient_pm('hash_data', e.data.packed)
    }
  },
  head_custom: {
    mute: true,
    need_login: false,
    confirm(e) {
      return `get custom head data`
    },
    handler(e) {
      return tzclient_pm('head_custom', e.data.path)
    }
  },
  block_head: {
    mute: true,
    need_login: false,
    confirm(e) {
      return `get block head of node`
    },
    handler(e) {
      return tzclient_pm('head')
    }
  },
  contract: {
    mute: true,
    need_login: false,
    confirm(e) {
      return `get info for contract:${e.data.contract}`
    },
    handler(e) {
      return tzclient_pm('contract', e.data.contract)
    }
  },
  transfer: {
    need_login: true,
    confirm(e) {
      return `transfer ${e.data.amount || 0}tz to ${e.data.destination} with parameter
${(e.data.parameters && JSON.stringify(e.data.parameters)) || 'Unit'}`
    },
    handler(e) {
      return tzclient_pm('transfer', dataClean(e.data))
    }
  },
  originate: {
    need_login: true,
    confirm(e) {
      return `originate contract for ${e.data.balance || 0}tz
with code:${!!e.data.script}`
    },
    handler(e) {
      return tzclient_pm('originate', dataClean(e.data))
    }
  },
  operations: {
    need_login: true,
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

const dispatcher = (channel, data) => {
  if (!data.tezbridge) return false

  if (!export_functions[data.method].mute)
    if (!confirm(`Allow ${channel.label} to \n${export_functions[data.method].confirm({data})}`)) {
      channel.send(JSON.stringify({tezbridge: data.tezbridge, error: 'unpass confirmation'}))
      return false
    }

  const p = export_functions[data.method].handler({data})
  if (p)
    p.then(x => {
      const result = {result: x}
      result.tezbridge = data.tezbridge
      channel.send(JSON.stringify(result))
    })
    .catch(err => {
      channel.send(JSON.stringify({tezbridge: data.tezbridge, error: err}))
    })
}

module.exports = {
  dispatcher,
  setInstance(x) {
    instance = x
  }
}