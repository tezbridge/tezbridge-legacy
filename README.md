# tezbridge

tezbridge is the one that allows you to visit the decentralized application of tomorrow in your browser and mobile today

---

## Support browsers
* Chrome 49+
* Firefox 52+
* Safari 11+ (Safari > Preferences > Privacy > Cookies and website data > Always allow)
* Edge 15+
* Opera 48+
* iOS Safari 11+ (Settings > Safari > Prevent Cross-Site Tracking > Off)
* Android Browser 56+
* Android Chrome 61+

## How to use
### For user
1. Open [https://tezbridge.github.io/](https://tezbridge.github.io/)
2. Import or create your account
3. Generate an access code
4. Open a Dapp or a decentralized website
5. Paste the access code when the browser asks your for it

Tip: one access code can be used only once

### For developer
0. view the Dapp demo [https://gistpreview.github.io/?a1672ec7f51663e7ebd3dac8af79b8f2](https://gistpreview.github.io/?a1672ec7f51663e7ebd3dac8af79b8f2)
1. add `<iframe src="https://tezbridge.github.io/plugin.html" id="tezbridge"></iframe>` in your web app
2. add codes below in your web app
```javascript
;((window) => {
  const req_func = {}
  const req_reject_func = {}

  const tezbridgeCreator = (iframe_window) => {
    return (param) => {
      return new Promise(function(resolve, reject){
        const tick = +new Date()
        param.tezbridge = tick
        iframe_window.contentWindow.postMessage(param, '*')
        req_func[tick] = resolve
        req_reject_func[tick] = reject
      })
    }
  }

  window.addEventListener('message', function(e){
    if (e.data.tezbridge) {
      if (e.data.error) 
        req_reject_func[e.data.tezbridge] && req_reject_func[e.data.tezbridge](e.data.error)
      else
        req_func[e.data.tezbridge] && req_func[e.data.tezbridge](e.data.result)
    }
  })

  window.tezbridgeCreator = tezbridgeCreator
})(window)
```

3. get the tezbridge object
```javascript
const tezbridge = window.tezbridgeCreator(document.querySelector('#tezbridge'))
```

4. use the tezbridge object (the iframe should be completely loaded)
```javascript
document.querySelector('#tezbridge').onload = () => {
  tezbridge({method: 'get_balance'}).then(x => console.log(x))
}
```

#### API list
1. Get public key hash
```javascript
tezbridge({method: 'get_pkh'})
```

2. Get balance
```javascript
tezbridge({method: 'get_balance'})
```

3. Get contract info (including code and storage)
```javascript
tezbridge({method: 'get_contract_info', contract: 'TZ...'})
```

4. Transfer
```javascript
tezbridge({method: 'transfer', amount: 0, destination: 'TZ.../tz...', parameters: {json object}})
```

## Donation
If this project help you reduce time to develop, you can give me a cup of milk 😊

BTC: `1L1Kbm7SmmzVLAAaZi9pQdtMnR2SDERZFc`

XEM: `NCWXS5-Z4EEBR-COYF4I-CKPIQV-Z5Z2ZY-HJWTAW-IJCP`

IOTA: `RSEBRIEHUKUTM9WUSNYMBYXDLDZKYQXUWBDVGDGWG9ZAXHGEEYR9IDSAJIBY9JR9YAIZYJV9CTIMWKNWX9LM9UEXUW`

## Credits
[https://github.com/stephenandrews/eztz](https://github.com/stephenandrews/eztz) (Easy Tezos JS Library)

## License
MIT