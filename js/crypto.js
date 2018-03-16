const to_hex = input => {
  return [].map.call(input, x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const from_hex = input => {
  return new Uint8Array(input.match(/[a-z0-9]{2}/g).map(x => parseInt(x, 16)))
}

const to_base64 = x => {
  return btoa(String.fromCharCode.apply(null, x))
}

const getKey = (password, salt) => {
  return argon2.hash({
      pass: password,
      salt: salt,
      time: 8,
      mem: 2048,
      hashLen: 64,
      parallelism: 1,
      type: argon2.ArgonType.Argon2i,
      distPath: './js'
  })
  .then(x => x.hash)
}

const encrypt = (password, content) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(16))

  return getKey(password, salt)
  .then(key => miscreant.AEAD.importKey(key, 'AES-PMAC-SIV'))
  .then(x => x.seal(new TextEncoder('utf-8').encode(content), iv))
  .then(x => ({
    v: 0.23,
    salt: to_hex(salt),
    iv: to_hex(iv),
    ciphertext: to_hex(x)
  }))
}

const decrypt = (password, cipherobj) => {
  if (cipherobj.v !== 0.23) {
    alert('The crypto system has been updated\nPlease clear your account and reimport it again')
    return Promise.reject()
  }

  const salt = from_hex(cipherobj.salt)
  const iv = from_hex(cipherobj.iv)
  const ciphertext = from_hex(cipherobj.ciphertext)

  return getKey(password, salt)
  .then(key => miscreant.AEAD.importKey(key, 'AES-PMAC-SIV'))
  .then(x => x.open(ciphertext, iv))
  .then(x => new TextDecoder('utf-8').decode(x))
}

module.exports = {
  encrypt,
  decrypt,
  to_base64
}
