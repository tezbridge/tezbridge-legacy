const components = require('./components')

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
    }
  })
})
