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

  new Vue({
    el: '#tezbridge',
    components: {

    },
    data: {
      view: {
        entry: getLocal('_') ? 'with-key' : 'without-key',
        subentry: '',
      },
      mnemonic: '',
      passphrase: '',
      localpwd: '',
      keys: {
        pk: '',
        pkh: '',
        sk: ''
      },
      balance: '',
      access_code: ''
    },
    methods: {
      clear: function(){
        if (confirm('Do you really want to clear the key?')) {
          setLocal('_', '')
          setLocal('__', '')
          location.reload()
        }
      },
      generate: function(){
        this.mnemonic = eztz.crypto.generateMnemonic()
        this.view.subentry = 'generate'
      },
      generate_next: function(){
        this.keys = eztz.crypto.generateKeys(this.mnemonic, this.passphrase)
        delete this.keys.passphrase
        delete this.keys.mnemonic
      },
      use_this_account: function(){
        this.passphrase = ''
        this.mnemonic = ''
        this.view.entry = ''

        window.localcrypto.encrypt(this.localpwd, JSON.stringify(this.keys), x => {
          this.localpwd = ''
          setLocal('_', JSON.stringify(x))
        })
      },
      view_stored: function(){
        const arr = JSON.parse(getLocal('_'))
        window.localcrypto.decrypt(this.localpwd, arr, x => {
          this.localpwd = ''
          this.keys = JSON.parse(x)
          this.view.entry = ''
        })
      },
      refresh_balance: function(){
        const self = this
        const pkh = this.keys.pkh
        rpc(() => 
          eztz.rpc.getBalance(pkh)
          .then(x => {
            self.balance = (x / 100).toFixed(2)
          }))
      },
      tez_faucet: function(){
        const self = this
        const pkh = this.keys.pkh
        rpc(() => 
          eztz.alphanet.faucet(pkh)
          .then(x => 
            eztz.rpc.getBalance(pkh)
            .then(function(x){
              self.balance = (x / 100).toFixed(2)
            })
          ))
      },
      gen_access_code: function(){
        const random_iv = window.crypto.getRandomValues(new Uint8Array(12))
        this.access_code = window.localcrypto.abtos(random_iv)
        window.localcrypto.encrypt(this.access_code, JSON.stringify(this.keys), x => {
          setLocal('__', JSON.stringify(x))
        })
      }
    }
  })
})(window)