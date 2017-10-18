(function(){
  var log = console.log
  var intro_dom = document.getElementById('intro')
  var lock_dom = document.getElementById('lock')
  var info_dom = document.getElementById('info')

  var data = {}

  var TIPS = {
    warning: function(e){
      return '[' + e.origin + '] wants to '
    }
  }

  var ROUTER = {
    get_address: {
      desc: 'Get your Tezos address',
      handler: function(){
        return Promise.resolve({reply: 'get_address', data: {address: data.pkh}})
      }
    },
    get_balance: {
      desc: 'Get your account balance',
      handler: function(){
        return tz_event.balance()
        .then(function(x){
          return {reply: 'get_balance', data: {balance: x}}
        })
      }
    }
  }

  var makeTx = function(operation, tz, callback){
    eztz.sendOperation(operation, {pk: data.pk, pkh: data.pkh, sk: data.sk}, tz, function(r){
      callback(r)
    })
  }

  var tz_event = {
    lock: function(){
      var input = prompt('Please set your password')
      if (input)
        localcrypto.encrypt(input, JSON.stringify(data), function(result){
          localStorage.setItem('_', result.join('.'))
        })
      return input
    },
    unlock: function(e, success_cb){
      var tip = (e ? TIPS.warning(e) + '`' + ROUTER[e.data.tz_method].desc + '`\n' : '') + 'Please input your password'
      var input = prompt(tip)
      var encrypted_data = localStorage.getItem('_')
      if (!encrypted_data) 
        return

      localcrypto.decrypt(input, encrypted_data.split('.'), function(result){
        data = JSON.parse(result)
        tz_renderer.info()
        success_cb && success_cb(data)
      })
    },
    generate: function(){
      var keys = eztz.crypto.generateKeysNoSeed()
      data.pk = keys.pk
      data.pkh = keys.pkh
      data.sk = keys.sk
      if (tz_event.lock())
        tz_renderer.info()
    },
    clear: function(){
      localStorage.setItem('_', '')
      location.reload()
    },
    balance: function(){
      return eztz.rpc.getBalance(data.pkh)
      .then(function(x){
        document.getElementById('balance').innerHTML = (x / 100).toFixed(2) + 'ꜩ'
        return Promise.resolve(x)
      })
    },
    add_balance: function(){
      return eztz.alphanet.faucet(data.pkh)
      .then(function(x){
        tz_event.balance()
      })
    }
  }

  var tz_renderer = {
    info: function(){
      intro_dom.style.display = 'none'
      lock_dom.style.display = 'none'
      info_dom.style.display = 'block'

      for (var key in data){
        var key_dom = document.getElementById(key)
        if (key_dom)
          key_dom.innerHTML = data[key]
      }
    },
    intro: function(){
      intro_dom.style.display = 'block'
      lock_dom.style.display = 'none'
      info_dom.style.display = 'none'
    },
    lock: function(){
      intro_dom.style.display = 'none'
      lock_dom.style.display = 'block'
      info_dom.style.display = 'none'
    }
  }

  var DISPATCHER = function(e){
    if (!e.data.tz_method) return

    var handler = function(){
      if (ROUTER[e.data.tz_method]){
        ROUTER[e.data.tz_method].handler()
        .then(function(reply_msg){
          e.source.postMessage(reply_msg, '*')
        })
      }
    }

    if (data.sk) {
      handler()
    } else {
      tz_event.unlock(e, function(){
        handler()
      })
    }
  }

  window.addEventListener('message', DISPATCHER)

  var init = function(){
    if (localStorage.getItem('_')){
      tz_renderer.lock()
    } else {
      tz_renderer.intro()
    }
  }

  init()

  window.tz_event = tz_event
})()