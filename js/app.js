const components_wrapper = require('./components')
const components = components_wrapper.components
const intro_version = components_wrapper.intro_version

const getLocal = x => JSON.parse(window.localStorage.getItem(x))
const setLocal = (x, y) => window.localStorage.setItem(x, JSON.stringify(y))
const removeLocal = x => window.localStorage.removeItem(x)

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    components,
    el: '#app',
    template: `
      <div class="body-wrapper">
        <div class="header">
          <b><img src="css/logo.png" /></b>
          <setting-modal ref="setting" />
          <dapp-list-modal ref="dapp_list" />
          <intro ref="intro" />
          <div class="row">
            <q-btn color="grey-6" flat icon="apps" @click="$refs.dapp_list.opened = true"  />
            <q-btn color="grey-6" flat icon="settings"  @click="$refs.setting.opened = true" />
          </div>
        </div>
        <account-list />
        <div class="footer">
          <a href="mailto:support@tezbridge.com">support@tezbridge.com</a>
          <span>© 2018 TezBridge</span>
        </div>
      </div>
    `,
    data() {
      return {
        dapp_list_opener: components.trigger.open_dapp_list
      }
    },
    methods: {
    },
    watch: {
      dapp_list_opener() {
        this.$refs.dapp_list.opened = true
      }
    },
    mounted() {
      // init
      const current_version = 0.15
      const version = getLocal('v')

      const reset = () => {
        setLocal('_', {})
        setLocal('*', {mute: true, relock: 20})
        removeLocal('__')
        setLocal('v', current_version)
      }

      if (version >= current_version) {
        const settings = getLocal('*')
        if (!('relock' in settings))
          setLocal('*', Object.assign(settings, {relock: 20}))

        if (getLocal('agreed') < intro_version) {
          this.$refs.intro.opened = true
        }
      } else {
        if (getLocal('_')) {
          this.$q.dialog({
            title: 'Reset warning',
            message: 'TezBridge needs to reset everything stored for updating.\n(Never store your accounts only in TezBridge.)',
            ok: 'OK',
            cancel: 'NO, KEEP MY DATA'
          })
          .then(() => {
            reset()
            location.reload()
          })
          .catch(() => {})
        } else
          reset()
      }
    }
  })
})
