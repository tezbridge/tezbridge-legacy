(function(){function b(d,e,g){function a(j,i){if(!e[j]){if(!d[j]){var k="function"==typeof require&&require;if(!i&&k)return k(j,!0);if(h)return h(j,!0);var c=new Error("Cannot find module '"+j+"'");throw c.code="MODULE_NOT_FOUND",c}var l=e[j]={exports:{}};d[j][0].call(l.exports,function(b){var c=d[j][1][b];return a(c||b)},l,l.exports,b,d,e,g)}return e[j].exports}for(var h="function"==typeof require&&require,c=0;c<g.length;c++)a(g[c]);return a}return b})()({1:[function(a){const b=a("./components"),c=(a)=>JSON.parse(window.localStorage.getItem(a)),d=(a,b)=>window.localStorage.setItem(a,JSON.stringify(b)),e=(a)=>window.localStorage.removeItem(a);document.addEventListener("DOMContentLoaded",()=>{new Vue({components:b,el:"#app",template:`
      <div class="body-wrapper">
        <div class="header">
          <img src="css/logo.png" />
          <setting-modal ref="setting" />
          <q-btn color="grey-6" icon="settings" flat round @click="$refs.setting.opened = true" size="md" />
        </div>
        <account-list />
      </div>
    `,data(){return{}},methods:{},beforeMount(){const a=.15,b=c("v"),f=()=>{d("_",{}),d("*",{mute:!0,timeout:!0}),e("__"),d("v",a)};return!(b>=a)&&void(c("_")?this.$q.dialog({title:"Reset warning",message:"TezBridge needs to reset everything stored for updating.\n(Never store your accounts only in TezBridge.)",ok:"OK",cancel:"NO, KEEP MY DATA"}).then(()=>{f(),location.reload()}).catch(()=>{}):f())}})})},{"./components":2}],2:[function(a,b){const c=(a)=>JSON.parse(window.localStorage.getItem(a)),d=(a,b)=>window.localStorage.setItem(a,JSON.stringify(b)),e={},f={};e.Account=Vue.component("account",{components:e,template:`
    <div>
      <div v-if="locked">
        <q-field :error="!!password_error" :error-label="password_error" helper="Password for account decryption">
          <q-input color="cyan-8" @keyup.enter="unlock" v-model="password" type="password" float-label="Password" />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" @click="unlock" label="Unlock" icon="lock open" outline />
          <q-btn color="red-6" @click="remove" label="Remove" icon="delete forever" outline />
        </div>
      </div>
      <div v-if="!locked">
        <q-list>
          <q-item>
            <q-item-side icon="account box" />
            <q-item-main>
              <q-item-tile label>Address</q-item-tile>
              <q-item-tile sublabel>
                <p class="ellipsis" ref="pkh_content">
                  {{public_key_hash}}
                </p>
              </q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="copyToClipboard($refs.pkh_content, 'Address')" icon="content copy" />
            </q-item-side>
          </q-item>
          <q-item>
            <q-item-side icon="vpn lock" />
            <q-item-main>
              <q-item-tile label>Secret Key</q-item-tile>
              <q-item-tile sublabel>
                <p class="ellipsis" ref="sk_content">
                  ******
                </p>
              </q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="copySecretKey" icon="content copy" />
            </q-item-side>
          </q-item>
          <q-item>
            <q-item-side icon="account_balance_wallet" />
            <q-item-main>
              <q-item-tile label>Balance</q-item-tile>
              <q-item-tile sublabel><b>{{balance}}</b>tz</q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="refreshBalance" icon="refresh" />
            </q-item-side>
            </q-item>
            <q-item>
              <q-item-side icon="vpn key" />
              <q-item-main>
                <q-item-tile label>Access code</q-item-tile>
                <q-item-tile sublabel>
                  <p class="ellipsis" ref="access_code">
                    {{access_code}}
                  </p>
                </q-item-tile>
              </q-item-main>
              <q-item-side>
                <q-btn flat @click="genAccessCode" icon="unarchive" />
              </q-item-side>
            </q-item>
        </q-list>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="lock" label="Lock" icon="lock" />
          <q-btn color="cyan-8" outline @click="accountExport" label="Export" icon="directions" />
        </div>
        <div class="center-wrapper">
          <q-btn push @click="activate" label="Activate account" icon="verified user" :disable="balance !== '0'" />
        </div>
        <q-inner-loading :visible="loading">
        </q-inner-loading>
      </div>
    </div>
  `,props:["account"],data(){return{locked:!0,loading:!1,tzclient:new TZClient,password:"",password_error:"",balance:"0",public_key_hash:"",access_code:c("__")?"Generated":"Ready to generate"}},methods:{refreshBalance(){this.loading=!0,this.tzclient.balance().then((a)=>this.balance=TZClient.tz2r(a)).finally(()=>this.loading=!1)},genAccessCode(){const a=window.crypto.getRandomValues(new Uint8Array(12));this.access_code=TZClient.libs.sodium.to_base64(a),this.$refs.access_code.innerHTML=this.access_code,this.tzclient.exportCipherData(this.access_code).then((a)=>{d("__",a)}).catch(()=>alert("Encryption failed")),this.copyToClipboard(this.$refs.access_code,"Access code")},copySecretKey(){this.$refs.sk_content.innerHTML=this.tzclient.key_pair.secret_key,this.copyToClipboard(this.$refs.sk_content,"Secret Key"),setTimeout(()=>{this.$refs.sk_content.innerHTML="******"},2e3)},accountExport(){this.$refs.sk_content.innerHTML=JSON.stringify(this.account.cipherdata),this.copyToClipboard(this.$refs.sk_content,"Encrypted account data"),this.$refs.sk_content.innerHTML="******"},copyToClipboard(a,b){const c=document.createRange(),d=window.getSelection();c.selectNodeContents(a),d.removeAllRanges(),d.addRange(c),document.execCommand("copy"),this.$q.notify({color:"positive",icon:"done",timeout:1500,message:b+" copied"})},activate(){this.loading=!0,this.$q.dialog({title:"Activation",message:"Please input the secret",prompt:{model:f[this.account.name],type:"text"},cancel:!0}).then((a)=>this.tzclient.activate(a).then(()=>{this.$q.notify({color:"positive",icon:"done",message:"Activation success"})}).catch((a)=>{this.$q.notify({color:"negative",icon:"error",message:a})})).catch(()=>{}).finally(()=>{this.loading=!1})},lock(){Object.assign(this.$data,this.$options.data())},remove(){this.$emit("remove")},unlock(){const a=new TZClient;a.importCipherData(this.account.cipherdata,this.password).then(()=>{this.password="",this.locked=!1,this.tzclient=a,this.public_key_hash=this.tzclient.key_pair.public_key_hash,this.tzclient.balance().then((a)=>this.balance=TZClient.tz2r(a))}).catch(()=>{this.password_error="Password incorrect"})}}}),e.AccountList=Vue.component("account-list",{components:e,template:`
    <q-list>
      <q-collapsible popup icon="account circle" :label="account.name" :key="account.name"
          @show="account_opacity = Object.assign({}, account_opacity, {[account.name]: 1})"
          @hide="account_opacity = Object.assign({}, account_opacity, {[account.name]: 0})"
          v-for="account in accounts">
        <account :account="account" @remove="removeAccount(account)" class="fade" :style="{opacity: account_opacity[account.name] || 0}" />
      </q-collapsible>
      <q-collapsible popup icon="add circle" label="Add account" v-model="collapse.add" @show="gen_opacity = 1" @hide="gen_opacity = 0">
        <gen-new-account @finish="newAccountFinish" class="fade" :style="{opacity: gen_opacity}" />
      </q-collapsible>
    </q-list>
  `,data(){return{account_opacity:{},gen_opacity:0,collapse:{add:!1},accounts:c("_")}},methods:{removeAccount(a){this.$q.dialog({title:"Removal confirmation",message:`Remove current account named ${a.name}?`,ok:"OK",cancel:"CANCEL"}).then(()=>{const b=c("_");delete b[a.name],d("_",b),this.accounts=b}).catch(()=>{})},newAccountFinish(){this.collapse.add=!1,this.accounts=c("_")}}});const g=(a,b,e)=>{try{const f=new TZClient(a);return f.exportCipherData(e).then((a)=>{const e=c("_");e[b]={name:b,cipherdata:a},d("_",e)})}catch(a){return Promise.reject(a.toString())}};e.GenNewAccount=Vue.component("gen-new-account",{template:`
    <q-stepper color="cyan-8" v-model="current_step" vertical>

      <q-step default name="account_name" title="Set account name" active-icon="edit" icon="perm_identity">
        <q-field :error="!!account_name_error" :error-label="account_name_error" helper="Set the account display name">
          <q-input color="cyan-8" @keyup.enter="setAccountName" v-model="account_name" float-label="Account name" />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="setAccountName" label="Next" icon="arrow downward" />
        </div>
      </q-step>

      <q-step name="password" title="Set password" active-icon="edit" icon="lock">
        <q-field :error="!!password_error" :error-label="password_error" helper="Set the account encryption password">
          <q-input color="cyan-8" v-model="password" type="password" float-label="Password" />
          <q-input color="cyan-8" @keyup.enter="confirmPassword" v-model="password_confirm" type="password" float-label="Password confirm"  />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="confirmPassword" label="Next" icon="arrow downward" />
        </div>
      </q-step>

      <q-step name="op_selection" title="Import or generate" active-icon="edit" icon="device hub">
        <div class="gutter-sm">
          <q-field label="Import" icon="move to inbox">
            <q-option-group
              color="cyan-8"
              type="radio"
              v-model="op_selection"
              :options="[
                { label: 'Mnemonic', value: 'mnemonic' },
                { label: 'Secret key', value: 'secret_key' },
                { label: 'Seed', value: 'seed' },
                { label: 'Faucet', value: 'faucet' },
                { label: 'TezBridge export', value: 'tezbridge' }
              ]"
            />
          </q-field>
          <q-field label="Generate" icon="person add">
            <q-radio color="cyan-8" v-model="op_selection" val="gen_mnemonic" label="Mnemonic" />
          </q-field>
        </div>
      </q-step>

      <q-step name="process" title="Process" active-icon="edit" icon="assignment">
        <div v-if="op_selection === 'gen_mnemonic'">
          <b class="mnemonic" v-for="word in gen_mnemonic">{{word}}</b>
          <q-field :error="!!gen_mnemonic_error" :error-label="gen_mnemonic_error" helper="Set the mnemonic passphrase">
            <q-input color="cyan-8" @keyup.enter="genMnemonic" v-model="gen_mnemonic_passphrase" type="password" float-label="Passphrase" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="genMnemonic" label="Generate" />
          </div>
        </div>
        <div v-if="op_selection === 'mnemonic'">
          <q-field :error="!!mnemonic_error" :error-label="mnemonic_error" helper="Mnemonic and passphrase for account import">
            <q-input color="cyan-8" @keyup.enter="importMnemonic" v-model="mnemonic_word"  float-label="Words" />
            <q-input color="cyan-8" @keyup.enter="importMnemonic" v-model="mnemonic_passphrase"  float-label="Passphrase" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importMnemonic" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'secret_key'">
          <q-field :error="!!secret_key_error" :error-label="secret_key_error" helper="A string of length 98 starts with edsk">
            <q-input color="cyan-8" @keyup.enter="importSecretKey" v-model="secret_key"  float-label="Secret key" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importSecretKey" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'seed'">
          <q-field :error="!!seed_error" :error-label="seed_error" helper="A string of length 54 starts with edsk">
            <q-input color="cyan-8" @keyup.enter="importSeed" v-model="seed"  float-label="Seed" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importSeed" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'tezbridge'">
          <q-field :error="!!tezbridge_error" :error-label="tezbridge_error" helper="Notice: you should use the original password to unlock this account">
            <q-input color="cyan-8" v-model="tezbridge_cipher"  float-label="Encrypted account data" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importTezbridge" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'faucet'">
          <q-field :error="!!faucet_error" :error-label="faucet_error" helper="Input the whole JSON data from faucet">
            <q-input color="cyan-8" v-model="faucet_data"  float-label="Faucet data" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importFaucetAccount" label="Import" />
          </div>
        </div>

      </q-step>

    </q-stepper>
  `,data(){return{password:"",password_confirm:"",password_error:"",account_name:"",account_name_error:"",op_selection:"",gen_mnemonic:[],gen_mnemonic_error:"",gen_mnemonic_passphrase:"",mnemonic_error:"",mnemonic_word:"",mnemonic_passphrase:"",secret_key_error:"",secret_key:"",seed_error:"",seed:"",tezbridge_error:"",tezbridge_cipher:"",faucet_error:"",faucet_data:"",current_step:"account_name"}},watch:{op_selection(a){if("op_selection"!==this.current_step)return!1;const b={gen_mnemonic:()=>{this.gen_mnemonic=TZClient.genMnemonic().split(" ")}}[a];b&&b(),this.current_step="process"}},methods:{accountGen(a){return g(a,this.account_name,this.password).then(()=>{this.$emit("finish"),Object.assign(this.$data,this.$options.data())})},importFaucetAccount(){if(!this.faucet_data)return void(this.faucet_error="Please input faucet JSON data");try{const a=JSON.parse(this.faucet_data);f[this.account_name]=a.secret,this.accountGen({mnemonic:a.mnemonic.join(" "),password:a.email+a.password}).catch((a)=>this.faucet_error=a)}catch(a){return void(this.faucet_error="The data should be a valid faucet JSON string")}},importTezbridge(){if(!this.tezbridge_cipher)return void(this.tezbridge_error="Please input exported account data");try{const a=c("_");a[this.account_name]={name:this.account_name,cipherdata:JSON.parse(this.tezbridge_cipher)},d("_",a),this.$emit("finish"),Object.assign(this.$data,this.$options.data())}catch(a){return void(this.tezbridge_error="The data should be a valid JSON string")}},importSeed(){return this.seed?void this.accountGen({seed:this.seed}).catch((a)=>this.seed_error=a):void(this.seed_error="Please input seed")},importSecretKey(){return this.secret_key?void this.accountGen({secret_key:this.secret_key}).catch((a)=>this.secret_key_error=a):void(this.secret_key_error="Please input secret key")},importMnemonic(){return this.mnemonic_word&&this.mnemonic_passphrase?void this.accountGen({mnemonic:this.mnemonic_word,password:this.mnemonic_passphrase}).catch((a)=>this.mnemonic_error=a):void(this.mnemonic_error="Please input words and passphrase")},genMnemonic(){return this.gen_mnemonic_passphrase?void this.accountGen({mnemonic:this.gen_mnemonic.join(" "),password:this.gen_mnemonic_passphrase}).catch((a)=>this.gen_mnemonic_error=a):void(this.gen_mnemonic_error="Please input password")},setAccountName(){const a=c("_");0===this.account_name.length?this.account_name_error="Please input your account name":this.account_name in a?this.account_name_error="This account name has already been used":(this.account_name_error="",this.current_step="password")},confirmPassword(){0===this.password.length?this.password_error="Please input your password":this.password===this.password_confirm?this.current_step="op_selection":this.password_error="The two passwords are not equal"}}});const h="zeronet.catsigma.com";e.SettingModal=Vue.component("setting-modal",{template:`
    <q-modal v-model="opened" content-css="padding: 24px">
      <q-select color="cyan-8" v-model="host" :options="hosts" float-label="Host"/>
      <q-list link>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="mute"/>
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Mute</q-item-tile>
            <q-item-tile sublabel>Mute for non-spending operations</q-item-tile>
          </q-item-main>
        </q-item>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="timeout"  />
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Timeout</q-item-tile>
            <q-item-tile sublabel>Limit session lifetime of plugin to 30 minutes</q-item-tile>
          </q-item-main>
        </q-item>
      </q-list>

      <q-btn color="cyan-8" outline icon="close" @click="opened = false" label="Close" />
    </q-modal>
  `,data(){return{opened:!1,mute:!!c("*").mute,timeout:!!c("*").timeout,host:c("*").host||h,hosts:[{label:h,value:h}]}},watch:{mute(a){this.valChange("mute",a)},timeout(a){this.valChange("timeout",a)},host(a){this.valChange("host",a)}},methods:{valChange(a,b){const e=c("*");e[a]=b,d("*",e)}}}),b.exports=e},{}]},{},[1]);