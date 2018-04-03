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
          <q-input @keyup.enter="unlock" v-model="password" type="password" float-label="Password" />
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
            <q-item-side icon="vpn lock" />
            <q-item-main>
              <q-item-tile label>Secret Key</q-item-tile>
              <q-item-tile sublabel>
                <p class="ellipsis" ref="sk_content">
                  ******
                </p>
              </q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="copySecretKey" icon="content copy" />
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
      access_code: getLocal('__') ? 'Generated' : 'Ready to generate'
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
    copySecretKey() {
      this.$refs.sk_content.innerHTML = this.tzclient.key_pair.secret_key
      this.copyToClipboard(this.$refs.sk_content, 'Secret Key')
      setTimeout(() => {
        this.$refs.sk_content.innerHTML = '******'
      }, 2000)
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
        timeout: 1500,
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
  components,
  template: `
    <q-tabs inverted align="justify">
      <q-tab default name="import" slot="title" icon="move to inbox" label="Import" />
      <q-tab name="generate" slot="title" icon="person add" label="Generate" />

      <q-tab-pane name="import">
        <import-account @finish="finish"/>
      </q-tab-pane>
      <q-tab-pane name="generate">
        <gen-new-account @finish="finish"/>
      </q-tab-pane>
    </q-tabs>
  `,
  data() {
    return {

    }
  },
  methods: {
    finish() {
      this.$emit('finish')
    }
  }
})

const genTZclient = (tzclient_param, account_name, password) => {
  try {
    const tzclient = new TZClient(tzclient_param)

    return tzclient.exportCipherData(password)
    .then(result => {
      const accounts = getLocal('_')
      accounts[account_name] = {
        name: account_name,
        cipherdata: result
      }
      setLocal('_', accounts)
    })
  } catch (err) {
    return Promise.reject(err.toString())
  }
}

components.ImportAccount = Vue.component('import-account', {
  template: `
    <div>
      <q-field :error="!!account_name_error" :error-label="account_name_error">
        <q-input v-model="account_name"  float-label="Account name" />
      </q-field>
      <q-tabs inverted align="justify">
        <q-tab default name="mnemonic" slot="title" label="Mnemonic" />
        <q-tab name="secret_key" slot="title" label="Secret key" />
        <q-tab name="seed" slot="title" label="Seed" />

        <q-tab-pane name="mnemonic">
          <q-field :error="!!mnemonic_error" :error-label="mnemonic_error">
            <q-input @keyup.enter="importMnemonic" v-model="mnemonic_word"  float-label="Words" />
            <q-input @keyup.enter="importMnemonic" v-model="mnemonic_password"  float-label="Password" />
          </q-field>
          <q-btn @click="importMnemonic" label="Import" />
        </q-tab-pane>

        <q-tab-pane name="secret_key">
          <q-field :error="!!secret_key_error" :error-label="secret_key_error">
            <q-input @keyup.enter="importSecretKey" v-model="secret_key"  float-label="Secret key" />
          </q-field>
          <q-btn @click="importSecretKey" label="Import" />
        </q-tab-pane>

        <q-tab-pane name="seed">
          <q-field :error="!!seed_error" :error-label="seed_error">
            <q-input @keyup.enter="importSeed" v-model="seed"  float-label="Secret key" />
          </q-field>
          <q-btn @click="importSeed" label="Import" />
        </q-tab-pane>
      </q-tabs>

    </div>
  `,
  data() {
    return {
      account_name: '',
      password: '',

      mnemonic_word: '',
      mnemonic_password: '',
      secret_key: '',
      seed: '',

      account_name_error: '',
      mnemonic_error: '',
      secret_key_error: '',
      seed_error: ''
    }
  },
  methods: {
    accountNameCheck() {
      const accounts = getLocal('_')

      if (this.account_name.length === 0) {
        this.account_name_error = 'Please input your account name'
        return false
      }
      else if (this.account_name in accounts) {
        this.account_name_error = 'This account name has already been used'
        return false
      }
      this.account_name_error = ''
      return true
    },
    accountGen(params) {
      return genTZclient(params, this.account_name, this.password)
      .then(() => {
        this.$emit('finish')
        Object.assign(this.$data, this.$options.data())
      })
    },
    importSeed() {
      if (!this.accountNameCheck()) return
      if (!this.seed) {
        this.seed_error = 'Please input seed'
        return
      }

      this.accountGen({
        seed: this.seed
      })
      .catch(err => this.seed_error = err)
    },
    importMnemonic() {
      if (!this.accountNameCheck()) return
      if (!this.mnemonic_word || !this.mnemonic_password) {
        this.mnemonic_error = 'Please input words and password'
        return
      }

      this.accountGen({
        mnemonic: this.mnemonic_word,
        password: this.mnemonic_password
      })
      .catch(err => this.mnemonic_error = err)
    },
    importSecretKey() {
      if (!this.accountNameCheck()) return
      if (!this.secret_key) {
        this.secret_key_error = 'Please input secret key'
        return
      }

      this.accountGen({
        secret_key: this.secret_key,
      })
      .catch(err => this.secret_key_error = err)
    }
  }
})

components.GenNewAccount = Vue.component('gen-new-account', {
  template: `
    <q-stepper v-model="current_step" vertical>
      <q-step default name="password" title="Set password" active-icon="edit" icon="lock">
        <q-field :error="!!password_error" :error-label="password_error">
          <q-input @keyup.enter="confirmPassword" v-model="password" type="password" float-label="Password" />
          <q-input @keyup.enter="confirmPassword" v-model="password_confirm" type="password" float-label="Password confirm"  />
        </q-field>
        <q-stepper-navigation>
          <q-btn @click="confirmPassword" label="Next" />
        </q-stepper-navigation>
      </q-step>

      <q-step name="account_name" title="Set account name" active-icon="edit" icon="perm_identity">
        <q-field :error="!!account_name_error" :error-label="account_name_error">
          <q-input @keyup.enter="setAccountName" v-model="account_name" float-label="Account name" />
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
      genTZclient({
        mnemonic: this.mnemonic.join(' '),
        password: this.password
      }, this.account_name, this.password)
      .then(() => {
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
        this.account_name_error = ''
        this.mnemonic = TZClient.genMnemonic().split(' ')
        this.current_step = 'mnemonic'
      }
    },
    confirmPassword() {
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

      <q-btn @click="opened = false" label="Close" />
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
