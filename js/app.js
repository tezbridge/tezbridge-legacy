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
