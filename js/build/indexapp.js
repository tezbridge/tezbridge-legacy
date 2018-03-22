(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
// const sodium = require('libsodium-wrappers')

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
  // return Promise.resolve(sodium.crypto_pwhash(
  //   64,
  //   password,
  //   salt,
  //   4,
  //   1024 * 2048,
  //   sodium.crypto_pwhash_ALG_ARGON2I13
  // ))
  return argon2.hash({
      pass: password,
      salt: salt,
      time: 4,
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
    v: 0.31,
    salt: to_hex(salt),
    iv: to_hex(iv),
    ciphertext: to_hex(x)
  }))
}

const decrypt = (password, cipherobj) => {
  if (cipherobj.v !== 0.31) {
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
  const TZClient = window.TZClient

  const getLocal = x => window.localStorage.getItem(x)
  const setLocal = (x, y) => window.localStorage.setItem(x, y)
  const removeLocal = (x, y) => window.localStorage.removeItem(x)

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
  if (getLocal('version') !== '0.11') {
    removeLocal('host')
    removeLocal('mute')
    removeLocal('timeout')
    setLocal('version', '0.11')
  }

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
},{"./crypto":1,"./main_template":3}],3:[function(require,module,exports){
const main_template = `
<div class="main">
  <div id="loading" v-if="view.loading"><span>{{view.loading}}</span></div>
    <div v-if="!view.entry">
      <p>ACCOUNT:</p>
      <p class="indent">{{tzclient.key_pair.public_key_hash}}</p>
      <p>SECRET KEY:</p>
      <p class="indent" @click="view.show_sk = !view.show_sk">
        {{view.show_sk ? tzclient.key_pair.secret_key : '*****'}}
      </p>
      <p>BALANCE:</p>
      <p class="indent">{{view.balance || 'UNKNOWN'}}</p>
      <p>ACCESS CODE:</p>
      <p class="indent" ref="accessCodeNode">{{plugin.access_code || 'NONE'}}</p>
      <p>OPTIONS:</p>
      <P class="indent">
        <label><input type="checkbox" v-model="plugin.mute" /> <span>Mute for non-spending operations</span></label>
        <br>
        <label><input type="checkbox" v-model="plugin.timeout" /> <span>Limit session lifetime of plugin to 30 minutes</span></label>
        <br>
        <span>HOST: </span>
        <select v-model="host">
          <option value="https://zeronet.catsigma.com">zeronet</option>
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
        <input type="radio" name="subentry" @click="switch_to_import" />
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
          <input placeholder="put mnemonic word here" v-model="key_import.mnemonic" /> <br>
          <input type="password" placeholder="type passphrase here" v-model="key_import.password" />
        </p>
        <br>

        <p>USING SECRET KEY</p>
        <p class="indent">
          <input placeholder="put secret key here" v-model="key_import.secret_key" />
        </p>
        <br>

        <p>USING SEED</p>
        <p class="indent">
          <input placeholder="put seed here" v-model="key_import.seed" />
        </p>
        <br>

        <button @click="import_key">IMPORT</button>
      </div>
      <div v-if="view.subentry === 'generate'" class="group">
        <div v-if="!tzclient.key_pair.secret_key">
          <p>{{key_import.mnemonic}}</p>
          <input type="password" placeholder="set passphrase here" v-model="key_import.password" />
          <br>
          <button @click="generate_next">NEXT</button>
        </div>
        <div v-if="tzclient.key_pair.secret_key">
          <p>SECRET KEY:</p>
          <p class="indent">{{tzclient.key_pair.secret_key}}</p>
          <input type="password" placeholder="type local secure password" v-model="localpwd" />
          <br>
          <button @click="use_this_account" v-if="tzclient.key_pair.secret_key">USE THIS ACCOUNT</button>
        </div>
      </div>
    </div>
</div>
`

module.exports = main_template
},{}]},{},[2]);
