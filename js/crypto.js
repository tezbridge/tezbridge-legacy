((window) => {
  const getKey = (password, salt) => {
    return sodium.crypto_pwhash(
      64,
      password,
      salt,
      64,
      1024 * 32,
      sodium.crypto_pwhash_ALG_ARGON2ID13)
  }

  const encrypt = (password, content) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const iv = window.crypto.getRandomValues(new Uint8Array(16))
    const key = getKey(password, salt)
    return miscreant.AEAD.importKey(key, 'AES-PMAC-SIV')
    .then(x => x.seal(new TextEncoder('utf-8').encode(content), iv))
    .then(x => ({
      v: 0.11,
      salt: sodium.to_hex(salt),
      iv: sodium.to_hex(iv),
      ciphertext: sodium.to_hex(x)}))
  }

  const decrypt = (password, cipherobj) => {
    if (cipherobj.v !== 0.11) {
      alert('The crypto system has been updated\nPlease clear your account and reimport it again')
      return Promise.reject()
    }

    const salt = sodium.from_hex(cipherobj.salt)
    const iv = sodium.from_hex(cipherobj.iv)
    const ciphertext = sodium.from_hex(cipherobj.ciphertext)

    const key = getKey(password, salt)
    return miscreant.AEAD.importKey(key, 'AES-PMAC-SIV')
    .then(x => x.open(ciphertext, iv))
    .then(x => new TextDecoder('utf-8').decode(x))
  }

  window.localcrypto = {
    encrypt,
    decrypt
  }
})(window)