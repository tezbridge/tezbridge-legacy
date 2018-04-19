const components = require('./components')

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
          <img src="css/logo.png" />
          <setting-modal ref="setting" />
          <q-btn color="grey-6" icon="settings" flat round @click="$refs.setting.opened = true" size="md" />
        </div>
        <account-list />
      </div>
    `,
    data() {
      return {
      }
    },
    methods: {
    },
    beforeMount() {
      // init
      const current_version = 0.14
      const version = getLocal('v')

      if (version < current_version) {
        this.$q.dialog({
          title: 'Reset warning',
          message: 'TezBridge needs to reset everything stored for updating.\n(Never store the account only in TezBridge.)',
          ok: 'OK',
          cancel: 'NO, KEEP MY DATA'
        })
        .then(() => {
          setLocal('_', {})
          setLocal('*', {mute: true, timeout: true})
          removeLocal('__')
          setLocal('v', current_version)
          location.reload()
        })
        .catch(() => {})
      }
    }
  })
})
