const components = require('./components')

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    components,
    el: '#app',
    template: `<account-list />`,
    data() {
      return {

      }
    }
  })
})
