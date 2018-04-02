const components = {}

components.AccountList = Vue.component('account-list', {
  components,
  template: `
    <q-list>
      <q-collapsible icon="account circle" :label="account.name" :key="account.ciphertext" v-for="account in accounts">
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

      mnemonic: ['dfd','gff', 'dagad', 'gwee'],
      current_step: 'password'
    }
  },
  methods: {
    finish() {
      this.$emit('finish')
      Object.assign(this.$data, this.$options.data())
    },
    setAccountName() {
      if (this.account_name.length === 0)
        this.account_name_error = true
      else
        this.current_step = 'mnemonic'
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
