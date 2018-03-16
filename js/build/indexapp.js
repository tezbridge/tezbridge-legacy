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
  const LocalCrypto = require('./crypto')

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

  // first time
  if (getLocal('host') === null)
    setLocal('host', 'https://teznode.catsigma.com')
  eztz.node.setProvider(getLocal('host'))

  if (getLocal('mute') === null)
    setLocal('mute', 'true')

  if (getLocal('plugin_timeout') === null)
    setLocal('plugin_timeout', '')

  const app = new Vue({
    el: '#tezbridge',
    template: require('./main_template'),
    data: {
      loading: '',
      mute: !!getLocal('mute'),
      plugin_timeout: !!getLocal('plugin_timeout'),
      host: getLocal('host'),
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
      show_sk: false,
      balance: '',
      access_code: '',
      import_sk: '',
      import_mnemonic: '',
      import_passphrase: ''
    },
    watch: {
      host(x) {
        eztz.node.setProvider(x)
        setLocal('host', x)
      },
      mute(x) {
        setLocal('mute', x ? 'true' : '')
      },
      plugin_timeout(x) {
        setLocal('plugin_timeout', x ? 'true' : '')
      }
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

        LocalCrypto.encrypt(this.localpwd, JSON.stringify(this.keys))
        .then(x => {
          this.view.entry = ''
          this.localpwd = ''
          setLocal('_', JSON.stringify(x))
        })
        .catch(() => alert('Encryption failed'))
      },
      view_stored: function(){
        const cipherobj = JSON.parse(getLocal('_'))
        LocalCrypto.decrypt(this.localpwd, cipherobj)
        .then(x => {
          this.localpwd = ''
          this.keys = JSON.parse(x)
          this.view.entry = ''
          this.access_code = getLocal('__') ? 'PREVIOUSLY GENERATED' : ''
        })
        .catch(() => alert('Decryption failed'))
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
        this.access_code = LocalCrypto.to_base64(random_iv)
        this.$refs.accessCodeNode.innerHTML = this.access_code

        LocalCrypto.encrypt(this.access_code, JSON.stringify(this.keys))
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
},{"./crypto":1,"./main_template":3}],3:[function(require,module,exports){
const main_template = `
<div class="main">
  <div id="loading" v-if="loading"><span>{{loading}}</span></div>
    <div v-if="!view.entry">
      <p>ACCOUNT:</p>
      <p class="indent">{{keys.pkh}}</p>
      <p>SECRET KEY:</p>
      <p class="indent" @click="show_sk = !show_sk">
        {{show_sk ? keys.sk : '*****'}}
      </p>
      <p>BALANCE:</p>
      <p class="indent">{{balance || 'UNKNOWN'}}</p>
      <p>ACCESS CODE:</p>
      <p class="indent" ref="accessCodeNode">{{access_code || 'NONE'}}</p>
      <p>OPTIONS:</p>
      <P class="indent">
        <label><input type="checkbox" v-model="mute" /> <span>Mute for non-spending operations</span></label>
        <br>
        <label><input type="checkbox" v-model="plugin_timeout" /> <span>Limit session lifetime of plugin to 30 minutes</span></label>
        <br>
        <span>HOST: </span>
        <select v-model="host">
          <option value="https://teznode.catsigma.com">alphanet</option>
          <option value="https://teznode-main.catsigma.com">mainnet</option>
        </select>
      </P>
      <p>OPERATIONS:</p>
      <p class="indent">
        <button @click="refresh_balance">REFRESH BALANCE</button> <br>
        <button @click="tez_faucet">+ BALANCE (ONLY IN ALPHANET)</button> <br>
        <button @click="clear">CLEAR</button> <br>
        <button @click="gen_access_code">GET ACCESS CODE</button> <br>
      </p>
    </div>
    <div v-if="view.entry === 'with-key'">
      <div class="group">
        <input type="password" placeholder="type local secure password" v-model="localpwd" />
        <button @click="view_stored">VIEW STORED ACCOUNT</button>
      </div>
      <div class="group">
        <button @click="clear">CLEAR</button>
      </div>
    </div>
    <div v-if="view.entry === 'without-key'">
      <label>
        <input type="radio" name="subentry" @click="view.subentry = 'import'" />
        <span>IMPORT</span>
      </label>
      <label>
        <input type="radio" name="subentry" @click="generate" />
        <span>GENERATE</span>
      </label>

      <div v-if="view.subentry.length === 0" class="group compatibility">
        <p>
          Support browsers:<br>
          <ul>
            <li>Chrome 49+</li>
            <li>Firefox 52+</li>
            <li>Safari 11+ (Safari > Preferences > Privacy > Cookies and website data > Always allow)</li>
            <li>Edge 15+</li>
            <li>Opera 48+</li>
            <li>iOS Safari 11+ (Settings > Safari > Prevent Cross-Site Tracking > Off)</li>
            <li>Android Browser 56+</li>
            <li>Android Chrome 61+</li>
          </ul>
        </p>
      </div>

      <div v-if="view.subentry === 'import'" class="group">
        <input type="password" placeholder="set local secure password" v-model="localpwd" /> <br>
        <br>

        <p>USING MNEMONIC</p>
        <p class="indent">
          <input placeholder="put mnemonic word here" v-model="import_mnemonic" /> <br>
          <input type="password" placeholder="type passphrase here" v-model="import_passphrase" />
        </p>
        <br>

        <p>USING SECRET KEY</p>
        <p class="indent">
          <input placeholder="put secret key here" v-model="import_sk" />
        </p>
        <br>

        <button @click="import_key">IMPORT</button>
      </div>
      <div v-if="view.subentry === 'generate'" class="group">
        <div v-if="!keys.sk">
          <p>{{mnemonic}}</p>
          <input type="password" placeholder="set passphrase here" v-model="passphrase" />
          <br>
          <button @click="generate_next">NEXT</button>
        </div>
        <div v-if="keys.sk">
          <p>SECRET KEY:</p>
          <p class="indent">{{keys.sk}}</p>
          <input type="password" placeholder="type local secure password" v-model="localpwd" />
          <br>
          <button @click="use_this_account" v-if="keys.sk">USE THIS ACCOUNT</button>
        </div>
      </div>
    </div>
</div>
`

module.exports = main_template
},{}]},{},[2]);
