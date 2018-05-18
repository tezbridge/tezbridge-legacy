const util = require('./util')
const components_wrapper = require('./components')
const components = components_wrapper.components
const intro_version = components_wrapper.intro_version

const getLocal = util.getLocal
const setLocal = util.setLocal
const removeLocal = util.removeLocal

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

      const default_settings = {
        mute: true,
        relock: 20,
        auto_dapp: true,
        detect_devtools: true
      }

      const reset = () => {
        setLocal('_', {})
        setLocal('*', default_settings)
        removeLocal('__')
        setLocal('v', current_version)

        setDefault()
      }

      const setDefault = () => {
        const settings = getLocal('*')

        for (const key in default_settings) {
          if (!(key in settings))
            setLocal('*', Object.assign(settings, {[key]: default_settings[key]}))
        }

        const hosts = new Set(util.hosts.map(x => x.value))
        if (!hosts.has(settings.host)) {
          setLocal('*', Object.assign(settings, {host: util.hosts[0].value}))
        }
        
        if (getLocal('agreed') < intro_version) {
          this.$refs.intro.opened = true
        }
      }

      if (version >= current_version) {

        setDefault()

      } else {
        if (getLocal('_')) {
          this.$q.dialog({
            color: 'cyan-8',
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
