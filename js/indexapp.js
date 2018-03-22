((window) => {
  const LocalCrypto = require('./crypto')
  const TZClient = window.TZClient

  const getLocal = x => window.localStorage.getItem(x)
  const setLocal = (x, y) => window.localStorage.setItem(x, y)
  const rpc = function(promise_fn){
    if (rpc.locked) return
    rpc.locked = true
    app.view.loading = 'RPC CALLING...'
    return promise_fn().then(function(x) {
      app.view.loading = ''
      rpc.locked = false
      return Promise.resolve(x)
    }).catch(function(err) {
      app.view.loading = ''
      rpc.locked = false
      return Promise.reject(err)
    })
  }

  // first time
  if (getLocal('host') === null)
    setLocal('host', 'https://zeronet.catsigma.com')

  if (getLocal('mute') === null)
    setLocal('mute', 'true')

  if (getLocal('timeout') === null)
    setLocal('timeout', '')

  const app = new Vue({
    el: '#tezbridge',
    template: require('./main_template'),
    data: {
      tzclient: new TZClient({host: getLocal('host')}),
      host: getLocal('host'),
      view: {
        show_sk: false,
        loading: '',
        entry: getLocal('_') ? 'with-key' : 'without-key',
        subentry: '',
        balance: ''
    },
      plugin: {
        access_code: '',
        mute: !!getLocal('mute'),
        timeout: !!getLocal('timeout'),
      },
      localpwd: '',
      key_import: {
        secret_key: '',
        mnemonic: '',
        password: '',
        seed: ''
      }
    },
    watch: {
      host(x) {
        this.tzclient.host = x
        setLocal('host', x)
      },
      'plugin.mute'(x) {
        setLocal('mute', x ? 'true' : '')
      },
      'plugin.timeout'(x) {
        setLocal('timeout', x ? 'true' : '')
      }
    },
    methods: {
      clear() {
        if (confirm('Do you really want to clear the key?')) {
          setLocal('_', '')
          setLocal('__', '')
          location.reload()
        }
      },
      switch_to_import() {
        this.key_import.mnemonic = ''
        this.key_import.password = ''
        this.key_import.secret_key = ''
        this.view.subentry = 'import'
      },
      import_key() {
        try {
          this.tzclient.importKey(this.key_import)
          app.use_this_account.call(app)
        } catch (e) {
          alert('Import failed')
        }
      },
      generate() {
        this.key_import.mnemonic = TZClient.genMnemonic()
        this.view.subentry = 'generate'
      },
      generate_next() {
        this.tzclient.importKey({
          mnemonic: this.key_import.mnemonic,
          password: this.key_import.password
        })
      },
      use_this_account() {
        LocalCrypto.encrypt(this.localpwd, this.tzclient.key_pair.secret_key)
        .then(x => {
          this.view.entry = ''
          this.localpwd = ''
          setLocal('_', JSON.stringify(x))
        })
        .catch(() => alert('Encryption failed'))
      },
      view_stored() {
        const cipherobj = JSON.parse(getLocal('_'))
        LocalCrypto.decrypt(this.localpwd, cipherobj)
        .then(x => {
          this.tzclient.importKey({secret_key: x})
          this.localpwd = ''
          this.view.entry = ''
          this.plugin.access_code = getLocal('__') ? 'PREVIOUSLY GENERATED' : ''
        })
        .catch(() => alert('Decryption failed'))
      },
      refresh_balance() {
        rpc(() => this.tzclient.balance().then(x => {
          this.view.balance = TZClient.tz2r(x)
        }))
      },
      tez_faucet() {
        rpc(() =>
          this.tzclient.faucet()
          .then(() => this.tzclient.balance())
          .then(x => {
            this.view.balance = TZClient.tz2r(x)
          }))
      },
      gen_access_code() {
        const random_iv = window.crypto.getRandomValues(new Uint8Array(12))
        this.plugin.access_code = LocalCrypto.to_base64(random_iv)
        this.$refs.accessCodeNode.innerHTML = this.plugin.access_code

        LocalCrypto.encrypt(this.plugin.access_code, this.tzclient.key_pair.secret_key)
        .then(x => {
          setLocal('__', JSON.stringify(x))
        })
        .catch(() => alert('Encryption failed'))

        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(this.$refs.accessCodeNode)
        selection.removeAllRanges()
        selection.addRange(range)
        document.execCommand("copy")

        this.view.loading = 'ACCESS CODE COPIED'
        setTimeout(() => {
          this.view.loading = ''
        }, 2000)
      }
    }
  })

  setTimeout(() => {
    document.body.style.opacity = 1
  }, 200)
})(window)