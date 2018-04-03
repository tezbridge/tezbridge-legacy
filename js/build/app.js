(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
const components = require('./components')

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    components,
    el: '#app',
    template: `
      <div>
        <div>
          Logo
          <setting-modal ref="setting" />
          <q-btn icon="settings" @click="$refs.setting.opened = true" />
        </div>
        <account-list />
      </div>
    `,
    data() {
      return {

      }
    }
  })
})

},{"./components":2}],2:[function(require,module,exports){
const getLocal = x => JSON.parse(window.localStorage.getItem(x))
const setLocal = (x, y) => window.localStorage.setItem(x, JSON.stringify(y))
const removeLocal = (x, y) => window.localStorage.removeItem(x)

// init
const current_version = 0.12
const version = getLocal('v')
if (version < current_version) {
  setLocal('_', {})
  setLocal('*', {})
  removeLocal('__')
  setLocal('v', current_version)
}

const components = {}

components.Account = Vue.component('account', {
  components,
  template: `
    <div>
      <div v-if="locked">
        <q-field :error="!!password_error" :error-label="password_error">
          <q-input v-model="password" type="password" float-label="Password" />
        </q-field>
        <q-btn @click="unlock" label="Unlock" icon="lock open" />
      </div>
      <div v-if="!locked">
        <q-list>
          <q-item>
            <q-item-side icon="account box" />
            <q-item-main>
              <q-item-tile label>Address</q-item-tile>
              <q-item-tile sublabel>
                <p class="ellipsis" ref="pkh_content">
                  {{public_key_hash}}
                </p>
              </q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="copyToClipboard($refs.pkh_content, 'Address')" icon="content copy" />
            </q-item-side>
          </q-item>
          <q-item>
            <q-item-side icon="account_balance_wallet" />
            <q-item-main>
              <q-item-tile label>Balance</q-item-tile>
              <q-item-tile sublabel>{{balance}}tz</q-item-tile>
            </q-item-main>
            </q-item>
            <q-item>
              <q-item-side icon="vpn key" />
              <q-item-main>
                <q-item-tile label>Access code</q-item-tile>
                <q-item-tile sublabel>
                  <p class="ellipsis" ref="access_code">
                    {{access_code}}
                  </p>
                </q-item-tile>
              </q-item-main>
              <q-item-side>
                <q-btn flat @click="genAccessCode" icon="refresh" />
              </q-item-side>
            </q-item>
        </q-list>
        <q-btn @click="lock" label="Lock" icon="lock" />
      </div>
    </div>
  `,
  props: ['account'],
  data() {
    return {
      locked: true,
      tzclient: new TZClient(),
      password: '',
      password_error: '',

      balance: 0,
      public_key_hash: '',
      access_code: getLocal('__') ? 'Previously generated' : 'Ungenerated'
    }
  },
  methods: {
    genAccessCode() {
      const random_iv = window.crypto.getRandomValues(new Uint8Array(12))
      this.access_code = TZClient.libs.sodium.to_base64(random_iv)
      this.$refs.access_code.innerHTML = this.access_code

      this.tzclient.exportCipherData(this.access_code)
      .then(x => {
        setLocal('__', x)
      })
      .catch(() => alert('Encryption failed'))

      this.copyToClipboard(this.$refs.access_code, 'Access code')
    },
    copyToClipboard(elem, name) {
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(elem)
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand("copy")
      this.$q.notify({
        color: 'positive',
        icon: 'done',
        timeout: 2000,
        message: name + ' copied'
      })
    },
    lock() {
      Object.assign(this.$data, this.$options.data())
    },
    unlock() {
      const tzclient = new TZClient()
      tzclient.importCipherData(this.account.cipherdata, this.password)
      .then(() => {
        this.locked = false
        this.tzclient = tzclient

        this.public_key_hash = this.tzclient.key_pair.public_key_hash
        this.tzclient.balance().then(x => this.balance = x)
      })
      .catch(err => {
        this.password_error = 'Password incorrect'
      })
    }
  }
})

components.AccountList = Vue.component('account-list', {
  components,
  template: `
    <q-list>
      <q-collapsible icon="account circle" :label="account.name" :key="account.name" v-for="account in accounts">
        <account :account="account" />
      </q-collapsible>
      <q-collapsible icon="add" label="Add account" v-model="collapse.add">
        <new-account-guide @finish="newAccountFinish" />
      </q-collapsible>
    </q-list>
  `,
  data() {
    return {
      collapse: {
        add: false
      },
      accounts: getLocal('_')
    }
  },
  methods: {
    newAccountFinish() {
      this.collapse.add = false
      this.accounts = getLocal('_')
    }
  }
})

components.NewAccountGuide = Vue.component('new-account-guide', {
  template: `
    <q-stepper v-model="current_step" vertical>
      <q-step default name="password" title="Set password" active-icon="edit" icon="lock">
        <q-field :error="!!password_error" :error-label="password_error">
          <q-input v-model="password" type="password" float-label="Password" />
          <q-input v-model="password_confirm" type="password" float-label="Password confirm"  />
        </q-field>
        <q-stepper-navigation>
          <q-btn @click="confirmPassowrd" label="Next" />
        </q-stepper-navigation>
      </q-step>

      <q-step name="account_name" title="Set account name" active-icon="edit" icon="perm_identity">
        <q-field :error="!!account_name_error" :error-label="account_name_error">
          <q-input v-model="account_name" float-label="Account name" />
        </q-field>
        <q-stepper-navigation>
          <q-btn @click="setAccountName" label="Next" />
        </q-stepper-navigation>
      </q-step>

      <q-step name="mnemonic" title="Write down mnemonic" active-icon="edit" icon="assignment">
        <b class="mnemonic" v-for="word in mnemonic">{{word}}</b>
        <q-stepper-navigation>
          <q-btn @click="finish" label="Finish" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  `,
  data() {
    return {
      password: '',
      password_confirm: '',
      password_error: '',

      account_name: '',
      account_name_error: '',

      mnemonic: [],
      current_step: 'password'
    }
  },
  methods: {
    finish() {
      const tzclient = new TZClient({
        mnemonic: this.mnemonic.join(' '),
        password: this.password})

      tzclient.exportCipherData(this.password)
      .then(result => {
        const accounts = getLocal('_')
        accounts[this.account_name] = {
          name: this.account_name,
          cipherdata: result
        }
        setLocal('_', accounts)

        this.$emit('finish')
        Object.assign(this.$data, this.$options.data())
      })

    },
    setAccountName() {
      const accounts = getLocal('_')

      if (this.account_name.length === 0)
        this.account_name_error = 'Please input your account name'
      else if (this.account_name in accounts) {
        this.account_name_error = 'This account name has already been used'
      }
      else {
        this.mnemonic = TZClient.genMnemonic().split(' ')
        this.current_step = 'mnemonic'
      }
    },
    confirmPassowrd() {
      if (this.password.length === 0)
        this.password_error = 'Please input your password'
      else if (this.password !== this.password_confirm) {
        this.password_error = 'The two passwords are not equal'
      } else {
        this.current_step = 'account_name'
      }
    }
  }
})


const domain = 'zeronet.catsigma.com'
components.SettingModal = Vue.component('setting-modal', {
  template: `
    <q-modal v-model="opened" content-css="padding: 24px">
      <q-select v-model="host" :options="hosts" float-label="Host"/>
      <q-list link>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox v-model="mute"/>
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Mute</q-item-tile>
            <q-item-tile sublabel>Mute for non-spending operations</q-item-tile>
          </q-item-main>
        </q-item>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox v-model="timeout"  />
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Timeout</q-item-tile>
            <q-item-tile sublabel>Limit session lifetime of plugin to 30 minutes</q-item-tile>
          </q-item-main>
        </q-item>
      </q-list>

      <q-btn flat @click="opened = false" label="Close" />
    </q-modal>
  `,
  data() {
    return {
      opened: false,

      mute: !!getLocal('*').mute,
      timeout: !!getLocal('*').timeout,
      host: getLocal('*').host || domain,
      hosts: [{
        label: domain,
        value: domain
      }]
    }
  },
  watch: {
    mute(v) {
      this.valChange('mute', v)
    },
    timeout(v) {
      this.valChange('timeout', v)
    },
    host(v) {
      this.valChange('host', v)
    }
  },
  methods: {
    valChange(name, value) {
      const setting = getLocal('*')
      setting[name] = value
      setLocal('*', setting)
    }
  }
})

module.exports = components

},{}]},{},[1]);
