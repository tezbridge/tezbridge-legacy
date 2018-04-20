# TezBridge

![TezBridge logo](https://raw.githubusercontent.com/tezbridge/tezbridge.github.io/ui/css/logo-frame.png)

TezBridge is the one that allows you to visit the decentralized application of tomorrow in your browser and mobile today.

---

## Support browsers
* Chrome 49+
* Firefox 52+
* Safari 11+ (Safari > Preferences > Privacy > Cookies and website data > Always allow)
* iOS 13+ (Settings > Safari > Prevent Cross-Site Tracking > Off)
* Android Browser 56+
* Android Chrome 61+

## How safe is TezBridge
Now the secret key stored in localStorage is protected by `Argon2i` + `AES-PMAC-SIV`.
So even if someone gets the ciphertext, it will take a lot efforts to crack it for him.

When using TezBridge plugin, the secret key in memory is placed inside a closure of a Web Worker of the iframe.
Browsers can prevent any third party DApp from stealing it.

### For users
1. Open [https://tezbridge.github.io/](https://tezbridge.github.io/)
2. Import or create your account
3. Generate an access code
4. Open a DApp or a decentralized website
5. Paste the access code when the browser asks your for it

Tip: one access code can be used only once

### For developers
0. add `<script src="https://tezbridge.github.io/plugin.js"></script>` in your HTML file, then you are good to go
1. view the DApp demo [https://tezbridge.github.io/test/dapp.html](https://tezbridge.github.io/test/dapp.html) (All sample codes placed here)

## Donation
If this project helps you reduce the time to develop, you could buy me a cup of milk. 😊

BTC: `1L1Kbm7SmmzVLAAaZi9pQdtMnR2SDERZFc`

## License
MIT
