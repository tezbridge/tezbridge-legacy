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

## How safe is tezbridge
Now the private key stored in localStorage is protected by `Argon2i` + `AES-PMAC-SIV`.
So even if someone gets the ciphertext, it will take a lot efforts to crack it for him.

## How to use

![How TezExchange(A Tezos Dapp) interact with TezBridge](https://user-images.githubusercontent.com/26104967/37083123-847b226c-2229-11e8-9985-916cf99adbce.gif)


How [TezExchange(A Tezos Dapp)](https://tezexchange.github.io/) interact with TezBridge

### For user
1. Open [https://tezbridge.github.io/](https://tezbridge.github.io/)
2. Import or create your account
3. Generate an access code
4. Open a Dapp or a decentralized website
5. Paste the access code when the browser asks your for it

Tip: one access code can be used only once

### For developer
0. add `<script src="https://tezbridge.github.io/plugin.js"></script>` in your HTML file, then you are good to go
1. view the Dapp demo [https://tezbridge.github.io/test/dapp.html](https://tezbridge.github.io/test/dapp.html)

#### API list
1. Get public key hash
```javascript
tezbridge({method: 'public_key_hash'})
```

2. Get balance
```javascript
tezbridge({method: 'balance'})
```

3. Get contract info (including code and storage)
```javascript
tezbridge({method: 'contract', contract: 'TZ...'})
```

4. Transfer
```javascript
tezbridge({method: 'transfer', amount: 0, destination: 'TZ.../tz...', parameters: {json object}})
```

5. Originate new contract
```javascript
tezbridge({
  method: 'originate',
  balance: 13.001001,
  script: script,    // script struct should be the same as the response of RPC result from API 3 - Get contract info
  spendable: true / false,    // optional, default is false
  delegatable: true / false,    // optional, default is false
  delegate: 'tz...'    // optional
})
```

## Donation
If this project help you reduce time to develop, you can buy me a cup of milk 😊

BTC: `1L1Kbm7SmmzVLAAaZi9pQdtMnR2SDERZFc`

## Credits
[https://github.com/stephenandrews/eztz](https://github.com/stephenandrews/eztz) (Easy Tezos JS Library)

## License
MIT
