const components = require('./components')

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    components,
    el: '#app',
    template: `
      <div class="body-wrapper">
        <div class="header">
          <b>Logo</b>
          <setting-modal ref="setting" />
          <q-btn icon="settings" outline round @click="$refs.setting.opened = true" size="sm" />
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
