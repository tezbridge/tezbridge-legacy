const getLocal = x => JSON.parse(window.localStorage.getItem(x))
const setLocal = (x, y) => window.localStorage.setItem(x, JSON.stringify(y))
const removeLocal = (x, y) => window.localStorage.removeItem(x)

// init
const current_version = 0.11
const version = getLocal('v')
if (version < current_version) {
  setLocal('_', {})
  removeLocal('__')
  setLocal('v', current_version)
}

const components = {}

components.AccountList = Vue.component('account-list', {
  components,
  template: `
    <q-list>
      <q-collapsible icon="account circle" :label="account.name" :key="account.cipherdata" v-for="account in accounts">
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
      accounts: []
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
        <q-field :error="password_error" error-label="The two passwords mismatch">
          <q-input v-model="password" type="password" float-label="Password" />
          <q-input v-model="password_confirm" type="password" float-label="Password confirm"  />
        </q-field>
        <q-stepper-navigation>
          <q-btn @click="confirmPassowrd" label="Next" />
        </q-stepper-navigation>
      </q-step>

      <q-step name="account_name" title="Set account name" active-icon="edit" icon="perm_identity">
        <q-field :error="account_name_error" error-label="Account name is incorrect">
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
      password_error: false,

      account_name: '',
      account_name_error: false,

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
      if (this.account_name.length === 0)
        this.account_name_error = true
      else {
        this.mnemonic = TZClient.genMnemonic().split(' ')
        this.current_step = 'mnemonic'
      }
    },
    confirmPassowrd() {
      if (this.password !== this.password_confirm) {
        this.password_error = true
      } else {
        this.current_step = 'account_name'
      }
    }
  }
})

module.exports = components
