const util = require('./util')

if (!Promise.prototype.finally) {
  Promise.prototype.finally = function(f) {
    return this.then(f, f).then(() => {})
  }
}

const getLocal = util.getLocal
const setLocal = util.setLocal
const removeLocal = util.removeLocal

const components = {
  trigger: {
    open_dapp_list: []
  }
}
const triggerGlobalEvent = (name) => {
  if (components.trigger[name].length > 0)
    components.trigger[name].pop()
  else
    components.trigger[name].push(1)
}

const temp_secrets = {}

components.Account = Vue.component('account', {
  components,
  template: `
    <div>
      <div v-if="locked">
        <q-field :error="!!password_error" :error-label="password_error" helper="Password for account decryption">
          <q-input color="cyan-8" @keyup.enter="unlock" v-model="password" type="password" float-label="Password" />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" @click="unlock" label="Unlock" icon="lock open" outline />
          <q-btn color="red-6" @click="remove" label="Remove" icon="delete forever" outline />
        </div>
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
              <q-item-tile sublabel><b>{{balance}}</b>tz</q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="refreshBalance" icon="refresh" />
            </q-item-side>
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
                <q-btn flat @click="genAccessCode" icon="unarchive" />
              </q-item-side>
            </q-item>
        </q-list>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="lock" label="Lock" icon="lock" />
          <q-btn color="cyan-8" outline @click="accountExport" label="Export" icon="directions" />
        </div>
        <div class="center-wrapper" v-if="temp_secrets[account.name]">
          <q-btn push @click="activate" label="Activate faucet" icon="verified user" />
        </div>
        <q-inner-loading :visible="loading">
        </q-inner-loading>
      </div>
    </div>
  `,
  props: ['account'],
  data() {
    return {
      temp_secrets,

      locked: true,
      loading: false,
      relock_timer: 0,

      tzclient: new TZClient(),
      password: '',
      password_error: '',

      balance: '0',
      public_key_hash: '',
      access_code: getLocal('__') ? 'Generated' : 'Ready to generate'
    }
  },
  methods: {
    refreshBalance() {
      this.loading = true
      this.tzclient.balance().then(x => this.balance = TZClient.tz2r(x))
      .catch(err => {
        this.$q.notify({
          color: 'negative',
          icon: 'error',
          message: err + ''
        })
      })
      .finally(() => this.loading = false)
    },
    genAccessCode() {
      const random_iv = window.crypto.getRandomValues(new Uint8Array(12))
      this.access_code = TZClient.libs.sodium.to_base64(random_iv)
      this.$refs.access_code.innerHTML = this.access_code

      this.tzclient.exportCipherData(this.access_code)
      .then(x => {
        setLocal('__', x)
      })
      .catch(() => {
        this.$q.notify({
          color: 'negative',
          icon: 'error',
          message: 'Encryption failed'
        })
      })

      this.copyToClipboard(this.$refs.access_code, 'Access code')

      if (getLocal('*').auto_dapp)
        triggerGlobalEvent('open_dapp_list')
    },
    copySecretKey() {
      this.$refs.sk_content.innerHTML = this.tzclient.key_pair.secret_key
      this.copyToClipboard(this.$refs.sk_content, 'Secret Key')
      setTimeout(() => {
        this.$refs.sk_content.innerHTML = '******'
      }, 2000)
    },
    accountExport() {
      this.$refs.sk_content.innerHTML = JSON.stringify(this.account.cipherdata)
      this.copyToClipboard(this.$refs.sk_content, 'Encrypted account data')
      this.$refs.sk_content.innerHTML = '******'
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
    activate() {
      this.loading = true
      this.$q.dialog({
        color: 'cyan-8',
        title: 'Activation',
        message: 'Please input the secret',
        prompt: {
          model: temp_secrets[this.account.name],
          type: 'text'
        },
        cancel: true
      })
      .then(secret => {
        return this.tzclient.activate(secret)
        .then(x => {
          this.$q.notify({
            color: 'positive',
            icon: 'done',
            message: 'Activation success'
          })
        })
        .catch(err => {
          this.$q.notify({
            color: 'negative',
            icon: 'error',
            message: err
          })
        })
      })
      .catch(() => {})
      .finally(() => {
        this.loading = false
      })
    },
    lock() {
      Object.assign(this.$data, this.$options.data())
    },
    remove() {
      this.$emit('remove')
    },
    unlock() {
      const tzclient = new TZClient({host: getLocal('*').host})
      tzclient.importCipherData(this.account.cipherdata, this.password)
      .then(() => {
        clearTimeout(this.relock_timer)
        const relock_setting = getLocal('*').relock
        if (relock_setting)
          this.relock_timer = setTimeout(() => {
            this.lock()
          }, 60 * 1000 * relock_setting)

        this.password = ''
        this.locked = false
        this.tzclient = tzclient

        this.public_key_hash = this.tzclient.key_pair.public_key_hash
        this.tzclient.balance().then(x => this.balance = TZClient.tz2r(x))

        util.devtoolsDetectListen(() => {
          this.lock()
        })
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
      <q-collapsible popup icon="account circle" :label="account.name" :key="account.name"
          @show="account_opacity = Object.assign({}, account_opacity, {[account.name]: 1})"
          @hide="account_opacity = Object.assign({}, account_opacity, {[account.name]: 0})"
          v-for="account in accounts">
        <account :account="account" @remove="removeAccount(account)" class="fade" :style="{opacity: account_opacity[account.name] || 0}" />
      </q-collapsible>
      <q-collapsible popup icon="add circle" label="Add account" v-model="collapse.add" @show="gen_opacity = 1" @hide="gen_opacity = 0">
        <gen-new-account @finish="newAccountFinish" class="fade" :style="{opacity: gen_opacity}" />
      </q-collapsible>
    </q-list>
  `,
  data() {
    return {
      account_opacity: {},
      gen_opacity: 0,

      collapse: {
        add: false
      },
      accounts: getLocal('_')
    }
  },
  methods: {
    removeAccount(account) {
      this.$q.dialog({
        color: 'cyan-8',
        title: 'Removal confirmation',
        message: `Remove current account named ${account.name}?`,
        ok: 'OK',
        cancel: 'CANCEL'
      }).then(() => {
        const accounts = getLocal('_')
        delete accounts[account.name]
        setLocal('_', accounts)
        this.accounts = accounts
      }).catch(() => {})
    },
    newAccountFinish() {
      this.collapse.add = false
      this.accounts = getLocal('_')
    }
  }
})


const genTZclient = (tzclient_param, account_name, password) => {
  try {
    const tzclient = new TZClient(tzclient_param)

    return tzclient.fail_check
    .then(() => {
      return tzclient.exportCipherData(password)
      .then(result => {
        const accounts = getLocal('_')
        accounts[account_name] = {
          name: account_name,
          cipherdata: result
        }
        setLocal('_', accounts)
      })
    })
  } catch (err) {
    return Promise.reject(err.toString())
  }
}


components.GenNewAccount = Vue.component('gen-new-account', {
  template: `
    <q-stepper color="cyan-8" v-model="current_step" vertical>

      <q-step default name="account_name" title="Set account name" active-icon="edit" icon="perm_identity">
        <q-field :error="!!account_name_error" :error-label="account_name_error" helper="Set the account display name">
          <q-input color="cyan-8" @keyup.enter="setAccountName" v-model="account_name" float-label="Account name" />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="setAccountName" label="Next" icon="arrow downward" />
        </div>
      </q-step>

      <q-step name="password" title="Set password" active-icon="edit" icon="lock">
        <q-field :error="!!password_error" :error-label="password_error" helper="Set the account encryption password">
          <q-input color="cyan-8" v-model="password" type="password" float-label="Password" />
          <q-input color="cyan-8" @keyup.enter="confirmPassword" v-model="password_confirm" type="password" float-label="Password confirm"  />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="confirmPassword" label="Next" icon="arrow downward" />
        </div>
      </q-step>

      <q-step name="op_selection" title="Import or generate" active-icon="edit" icon="device hub">
        <div class="gutter-sm">
          <q-field label="Import" icon="move to inbox">
            <q-option-group
              color="cyan-8"
              type="radio"
              v-model="op_selection"
              :options="[
                { label: 'Mnemonic', value: 'mnemonic' },
                { label: 'Secret key', value: 'secret_key' },
                { label: 'Seed', value: 'seed' },
                { label: 'Encrypted', value: 'encrypted_seed' },
                { label: 'Faucet', value: 'faucet' },
                { label: 'TezBridge export', value: 'tezbridge' }
              ]"
            />
          </q-field>
          <q-field label="Generate" icon="person add">
            <q-radio color="cyan-8" v-model="op_selection" val="gen_mnemonic" label="Mnemonic" />
          </q-field>
        </div>
      </q-step>

      <q-step name="process" title="Process" active-icon="edit" icon="assignment">
        <div v-if="op_selection === 'gen_mnemonic'">
          <b class="mnemonic" v-for="word in gen_mnemonic">{{word}}</b>
          <q-field :error="!!gen_mnemonic_error" :error-label="gen_mnemonic_error" helper="Set the mnemonic passphrase">
            <q-input color="cyan-8" @keyup.enter="genMnemonic" v-model="gen_mnemonic_passphrase" type="password" float-label="Passphrase" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="genMnemonic" label="Generate" />
          </div>
        </div>
        <div v-if="op_selection === 'mnemonic'">
          <q-field :error="!!mnemonic_error" :error-label="mnemonic_error" helper="Mnemonic and passphrase for account import">
            <q-input color="cyan-8" @keyup.enter="importMnemonic" v-model="mnemonic_word"  float-label="Words" />
            <q-input color="cyan-8" @keyup.enter="importMnemonic" v-model="mnemonic_passphrase" type="password" float-label="Passphrase" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importMnemonic" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'secret_key'">
          <q-field :error="!!secret_key_error" :error-label="secret_key_error" helper="A string of length 98 starts with edsk">
            <q-input color="cyan-8" @keyup.enter="importSecretKey" v-model="secret_key"  float-label="Secret key" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importSecretKey" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'seed'">
          <q-field :error="!!seed_error" :error-label="seed_error" helper="A string of length 54 starts with edsk">
            <q-input color="cyan-8" @keyup.enter="importSeed" v-model="seed"  float-label="Seed" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importSeed" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'encrypted_seed'">
          <q-field :error="!!encrypted_seed_error" :error-label="encrypted_seed_error" helper="A string of length 54 starts with edesk">
            <q-input color="cyan-8" @keyup.enter="importEncrypted_seed" v-model="encrypted_seed"  float-label="Encrypted" />
            <q-input color="cyan-8" @keyup.enter="importEncrypted_seed" v-model="encrypted_seed_password" type="password"  float-label="Password" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importEncrypted_seed" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'tezbridge'">
          <q-field :error="!!tezbridge_error" :error-label="tezbridge_error" helper="Notice: you should use the original password to unlock this account">
            <q-input color="cyan-8" v-model="tezbridge_cipher"  float-label="Encrypted account data" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importTezbridge" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'faucet'">
          <q-field :error="!!faucet_error" :error-label="faucet_error" helper="Input the whole JSON data from faucet">
            <q-input color="cyan-8" v-model="faucet_data"  float-label="Faucet data" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importFaucetAccount" label="Import" />
          </div>
        </div>

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

      op_selection: '',

      gen_mnemonic: [],
      gen_mnemonic_error: '',
      gen_mnemonic_passphrase: '',

      mnemonic_error: '',
      mnemonic_word: '',
      mnemonic_passphrase: '',

      secret_key_error: '',
      secret_key: '',

      seed_error: '',
      seed: '',

      encrypted_seed_error: '',
      encrypted_seed: '',
      encrypted_seed_password: '',

      tezbridge_error: '',
      tezbridge_cipher: '',

      faucet_error: '',
      faucet_data: '',

      current_step: 'account_name'
    }
  },
  watch: {
    op_selection(v) {
      if (this.current_step !== 'op_selection')
        return false

      const pre_process = ({
        'gen_mnemonic': () => {
          this.gen_mnemonic = TZClient.genMnemonic().split(' ')
        }
      })[v]

      if (pre_process) pre_process()
      this.current_step = 'process'
    }
  },
  methods: {
    accountGen(params) {
      return genTZclient(params, this.account_name, this.password)
      .then(() => {
        this.$emit('finish')
        Object.assign(this.$data, this.$options.data())
      })
      .catch(err => Promise.reject(err.toString()))
    },
    importFaucetAccount() {
      if (!this.faucet_data) {
        this.faucet_error = 'Please input faucet JSON data'
        return
      }

      try {
        const data = JSON.parse(this.faucet_data)
        temp_secrets[this.account_name] = data.secret

        this.accountGen({
          mnemonic: data.mnemonic.join(' '),
          password: data.email + data.password
        })
        .catch(err => this.faucet_error = err)
      } catch(err) {
        this.faucet_error = 'The data should be a valid faucet JSON string'
        return
      }
    },
    importTezbridge() {
      if (!this.tezbridge_cipher) {
        this.tezbridge_error = 'Please input exported account data'
        return
      }

      try {
        const accounts = getLocal('_')
        accounts[this.account_name] = {
          name: this.account_name,
          cipherdata: JSON.parse(this.tezbridge_cipher)
        }
        setLocal('_', accounts)

        this.$emit('finish')
        Object.assign(this.$data, this.$options.data())

      } catch(err) {
        this.tezbridge_error = 'The data should be a valid JSON string'
        return
      }

    },
    importEncrypted_seed() {
      if (!this.encrypted_seed) {
        this.encrypted_seed_error = 'Please input valid encrypted seed'
        return
      }

      this.accountGen({
        encrypted_seed: this.encrypted_seed,
        password: this.encrypted_seed_password
      })
      .catch(err => this.encrypted_seed_error = err)
    },
    importSeed() {
      if (!this.seed) {
        this.seed_error = 'Please input seed'
        return
      }

      this.accountGen({
        seed: this.seed
      })
      .catch(err => this.seed_error = err)
    },
    importSecretKey() {
      if (!this.secret_key) {
        this.secret_key_error = 'Please input secret key'
        return
      }

      this.accountGen({
        secret_key: this.secret_key,
      })
      .catch(err => this.secret_key_error = err)
    },
    importMnemonic() {
      if (!this.mnemonic_word || !this.mnemonic_passphrase) {
        this.mnemonic_error = 'Please input words and passphrase'
        return
      }

      this.accountGen({
        mnemonic: this.mnemonic_word,
        password: this.mnemonic_passphrase
      })
      .catch(err => this.mnemonic_error = err)
    },
    genMnemonic() {
      if (!this.gen_mnemonic_passphrase) {
        this.gen_mnemonic_error = 'Please input password'
        return
      }

      this.accountGen({
        mnemonic: this.gen_mnemonic.join(' '),
        password: this.gen_mnemonic_passphrase
      })
      .catch(err => this.gen_mnemonic_error = err)
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
        this.current_step = 'password'
      }
    },
    confirmPassword() {
      if (this.password.length === 0)
        this.password_error = 'Please input your password'
      else if (this.password !== this.password_confirm) {
        this.password_error = 'The two passwords are not equal'
      } else {
        this.current_step = 'op_selection'
      }
    }
  }
})



components.SettingModal = Vue.component('setting-modal', {
  template: `
    <q-modal v-model="opened" content-css="padding: 24px; position: relative">
      <q-list>
        <q-item>
          <q-select color="cyan-8" v-model="host" :options="hosts" float-label="Host"/>
        </q-item>
        <q-item>
          <q-field helper="This works both for home and plugin.">
            <q-input color="cyan-8" type="number" v-model.number="relock" float-label="Minutes to relock" />
          </q-field>
        </q-item>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="auto_dapp"/>
          </q-item-side>
          <q-item-main>
            <q-item-tile label>DApp list auto popup</q-item-tile>
            <q-item-tile sublabel>Popup DApp list when the access code is generated</q-item-tile>
          </q-item-main>
        </q-item>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="detect_devtools"/>
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Detect devtools (reboot needed)</q-item-tile>
            <q-item-tile sublabel>Flush secret key when the devtools is opened</q-item-tile>
          </q-item-main>
        </q-item>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="mute"/>
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Mute</q-item-tile>
            <q-item-tile sublabel>Mute for non-spending operations</q-item-tile>
          </q-item-main>
        </q-item>
      </q-list>

      <q-btn color="cyan-8" outline icon="close" @click="opened = false" class="modal-close-btn" />
    </q-modal>
  `,
  data() {

    return {
      opened: false,

      auto_dapp: false,
      mute: false,
      relock: 0,
      host: '',
      detect_devtools: false,

      hosts: util.hosts
    }
  },
  watch: {
    opened(v) {
      if (v) {
        const settings = getLocal('*') || {}
        this.auto_dapp = !!settings.auto_dapp
        this.mute = !!settings.mute
        this.relock = settings.relock || 0
        this.detect_devtools = settings.detect_devtools
        this.host = settings.host
      }
    },
    mute(v) {
      this.valChange('mute', v)
    },
    relock(v) {
      this.valChange('relock', v)
    },
    host(v) {
      this.valChange('host', v)
    },
    auto_dapp(v) {
      this.valChange('auto_dapp', v)
    },
    detect_devtools(v) {
      this.valChange('detect_devtools', v)
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

components.DAppListModal = Vue.component('dapp-list-modal', {
  template: `
    <q-modal v-model="opened" content-css="padding: 24px; position: relative">
      <div class="dapp-list">
        <div class="title">ÐAPP FAST ACCESS</div>
        <q-list>
          <q-item>
            <a href="https://tez.exchange" target="_blank">tez.exchange</a>
            <span>DEX for Tezos</span>
          </q-item>
          <q-item class="dim">
            <a href="/dapps/sample/index.html" target="_blank">DApp sample</a>
            <span>A DApp sample for developers</span>
          </q-item>
        </q-list>
        <q-btn color="cyan-8" outline icon="close" @click="opened = false" class="modal-close-btn" />
      </div>
    </q-modal>
  `,
  data() {
    return {
      opened: false
    }
  }
})

const intro_version = 1.2
components.Intro = Vue.component('intro', {
  template: `
    <q-modal v-model="opened" content-css="padding: 24px; position: relative">
      <div class="intro">
        <div class="title">Welcome to TezBridge!</div>
        <div>
          <span>What is TezBridge?</span> <br>
          * TezBridge is a free, open-source Tezos client. <br>
          * TezBridge contains a cross-browser plugin to interact with Tezos Web DApps. <br>
          * TezBridge connects directly with Tezos blockchain.
        </div>
        <div>
          <span>What TezBridge <b>CAN'T</b> do?</span> <br>
          * Recover or change your private key. <br>
          * Recover or reset your password. <br>
          * Reverse, cancel, or refund transactions. <br>
          * Freeze accounts. <br>
          * Access your accounts for you.
        </div>
        <div class="tip" v-if="config_tip.length">
          <span>Tips</span> <br>
          * For cross-domain usage of TezBridge plugin, you need to adjust the settings. <br>
          {{config_tip}}
        </div>
        <q-btn color="cyan-8" outline icon="check" @click="agree" label="Agree" class="agree-btn" />
      </div>
    </q-modal>
  `,
  data() {
    return {
      opened: false,
      config_tip: ''
    }
  },
  methods: {
    agree() {
      setLocal('agreed', intro_version)
      this.opened = false
    }
  },
  beforeMount() {
    const userAgent = window.navigator.userAgent
    if (userAgent.indexOf('iPhone OS') > -1) {
      this.config_tip = '[Settings > Safari > Prevent Cross-Site Tracking > Off]'
    } else if (userAgent.indexOf('Chrome/') === -1 && userAgent.indexOf('Safari/') > -1) {
      this.config_tip = '[Safari > Preferences > Privacy > Cookies and website data > Always allow]'
    }
  }
})


module.exports = {components, intro_version}