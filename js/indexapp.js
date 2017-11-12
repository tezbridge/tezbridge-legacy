((window) => {
  // eztz.node.setProvider('https://teznode.catsigma.com')

  const getLocal = x => window.localStorage.getItem(x)
  const setLocal = (x, y) => window.localStorage.setItem(x, y)
  const rpc = function(promise_fn){
    if (rpc.locked) return
    rpc.locked = true
    app.loading = 'RPC CALLING...'
    return promise_fn().then(function(x) {
      app.loading = ''
      rpc.locked = false
      return Promise.resolve(x)
    }).catch(function(err) {
      app.loading = ''
      rpc.locked = false
      return Promise.reject(err)
    })
  }

  const app = new Vue({
    el: '#tezbridge',
    components: {

    },
    data: {
      loading: '',
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
      access_code: '',
      import_sk: '',
      import_mnemonic: '',
      import_passphrase: ''
    },
    methods: {
      clear: function(){
        if (confirm('Do you really want to clear the key?')) {
          setLocal('_', '')
          setLocal('__', '')
          location.reload()
        }
      },
      import_key: function(){
        try {
          if (this.import_sk) {
            this.keys.pk = eztz.utility.b58cencode(eztz.utility.b58cdecode(this.import_sk, eztz.prefix.edsk).slice(32), eztz.prefix.edpk)
            this.keys.pkh = eztz.utility.b58cencode(eztz.library.sodium.crypto_generichash(20, eztz.utility.b58cdecode(this.import_sk, eztz.prefix.edsk).slice(32)), eztz.prefix.tz1)
            this.keys.sk = this.import_sk
          } else if (this.import_mnemonic && this.import_passphrase) {
            this.keys = eztz.crypto.generateKeys(this.import_mnemonic, this.import_passphrase)
            delete this.keys.passphrase
            delete this.keys.mnemonic
          }
          app.use_this_account.call(app)
        } catch (e) {
          alert('Import failed')
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
          this.access_code = getLocal('__') ? 'PREVIOUSLY GENERATED' : ''
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

        setTimeout(() => {
          const range = document.createRange()
          const selection = window.getSelection()
          range.selectNodeContents(this.$refs.accessCodeNode)
          selection.removeAllRanges()
          selection.addRange(range)
          document.execCommand("Copy")
        }, 1000)
        

        this.loading = 'ACCESS CODE COPIED'
        setTimeout(() => {
          this.loading = ''
        }, 2000)
      }
    }
  })

  setTimeout(() => {
    document.body.style.opacity = 1
  }, 200)
})(window)