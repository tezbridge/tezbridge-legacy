const sodium = require('./libsodium-wrappers')

const getKey = (password, salt) => {
  try {
    const key = sodium.crypto_pwhash(
      64,
      password,
      salt,
      4,
      1024 * 2048,
      sodium.crypto_pwhash_ALG_ARGON2I13
    )
    return Promise.resolve(key)
  } catch(err) {
    return Promise.reject(err)
  }
}

const getAES = key => {
  try {
    return miscreant.AEAD.importKey(key, 'AES-PMAC-SIV')
  } catch(err) {
    return Promise.reject(err)
  }
}

const encrypt = (password, content) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(16))

  return getKey(password, salt)
  .then(key => getAES(key))
  .then(x => x.seal(new TextEncoder('utf-8').encode(content), iv))
  .then(x => ({
    v: 0.41,
    salt: sodium.to_hex(salt),
    iv: sodium.to_hex(iv),
    ciphertext: sodium.to_hex(x)
  }))
}

const decrypt = (password, cipherobj) => {
  if (cipherobj.v !== 0.41) {
    alert('The crypto system has been updated\nPlease clear your account and reimport it again')
    return Promise.reject()
  }

  const salt = sodium.from_hex(cipherobj.salt)
  const iv = sodium.from_hex(cipherobj.iv)
  const ciphertext = sodium.from_hex(cipherobj.ciphertext)

  return getKey(password, salt)
  .then(key => getAES(key))
  .then(x => x.open(ciphertext, iv))
  .then(x => new TextDecoder('utf-8').decode(x))
}

module.exports = {
  encrypt,
  decrypt
}
