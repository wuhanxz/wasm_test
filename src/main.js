// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Module from './assets/filter_image'

Vue.config.productionTip = false

async function waitwasm() {
  const wasmModule = await Module
  wasmModule.onRuntimeInitialized = () => {
    Vue.prototype.$wasm = wasmModule
    //new Vue ...
    /* eslint-disable no-new */
    new Vue({
      el: '#app',
      router,
      components: { App },
      template: '<App/>'
    })
  }
}

(async () => {
  waitwasm()
})()


