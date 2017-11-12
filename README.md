# tezbridge

tezbridge is the one that allows you to visit the distributed application of tomorrow in your browser and mobile today

---

## Support browsers
* Chrome 49+
* Firefox 52+
* Safari 11+
* Edge 15+
* Opera 48+
* iOS Safari 11+
* Android Browser 56+
* Android Chrome 61+

## How to use
### For user
1. Open [https://tezbridge.github.io/](https://tezbridge.github.io/)
2. Import or create your account
3. Generate an access code
4. Open a Dapp or a distributed website
5. Paste the access code when the browser asks your for it

Tip: one access code can be used only once

### For developer
1. add `<iframe src="https://tezbridge.github.io/plugin.html" id="tezbridge"></iframe>` in your web app
2. add codes below in your web app
```javascript
;((window) => {
  const req_func = {}

  const tezbridgeCreator = (iframe_window) => {
    return (param) => {
      return new Promise(function(resolve, reject){
        const tick = +new Date()
        param.tezbridge = tick
        iframe_window.contentWindow.postMessage(param, '*')
        req_func[tick] = resolve
      })
    }
  }

  window.addEventListener('message', function(e){
    req_func[e.data.tezbridge] && req_func[e.data.tezbridge](e.data.result)
  })  

  window.tezbridgeCreator = tezbridgeCreator
})(window)
```

3. get the tezbridge object
```javascript
const tezbridge = window.tezbridgeCreator(document.querySelector('#tezbridge'))

```

4. use the tezbridge object
```javascript
tezbridge({method: 'get_balance'})
.then(x => console.log(x))
```

#### API list
1. Get public key hash
```
tezbridge({method: 'get_pkh'})
```

2. Get balance
```
tezbridge({method: 'get_balance'})
```

3. Get contract info (including code and storage)
```
tezbridge({method: 'get_contract_info', contract: 'TZ...'})
```

4. Transfer
```
tezbridge({method: 'transfer', amount: 0, destination: 'TZ.../tz...', parameters: {json object}})
```

## Donation
If this project help you reduce time to develop, you can give me a cup of milk 😊

BTC: `1L1Kbm7SmmzVLAAaZi9pQdtMnR2SDERZFc`

XEM: `NCWXS5-Z4EEBR-COYF4I-CKPIQV-Z5Z2ZY-HJWTAW-IJCP`

IOTA: `RSEBRIEHUKUTM9WUSNYMBYXDLDZKYQXUWBDVGDGWG9ZAXHGEEYR9IDSAJIBY9JR9YAIZYJV9CTIMWKNWX9LM9UEXUW`