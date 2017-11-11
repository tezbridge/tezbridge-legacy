((window) => {
  const abtos = (arrayBuffer) => {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
  }

  const stoab = (base64) => {
    const binary_string =  window.atob(base64)
    const len = binary_string.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes.buffer
  }

  const encrypt = (password, content, callback) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    window.crypto.subtle.generateKey(
        {name: "AES-GCM", length: 256},
        true, ["encrypt"])
    .then((aesKey) => {
      const encrypt_content = window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
          additionalData: stoab(btoa(password)),
          tagLength: 128, 
        },
        aesKey,
        stoab(btoa(content))
      )
      const export_key = window.crypto.subtle.exportKey(
        "raw", 
        aesKey
      )
      return Promise.all([encrypt_content, export_key])
    })
    .then((result) => {
      callback([abtos(result[0]), abtos(result[1]), abtos(iv)])
    })
    .catch((err) => {
      console.log(err)
      alert(`Encrypt error:${err}`)
    })
  }

  const decrypt = (password, encrypted_data_array, callback) => {
    const encrypted_content = encrypted_data_array[0]
    const key = encrypted_data_array[1]
    const iv = encrypted_data_array[2]

    window.crypto.subtle.importKey(
      "raw", 
      stoab(key),
      {
        name: "AES-GCM",
      },
      false, 
      ["decrypt"]
    )
    .then((key) => {
      return window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: stoab(iv),
            additionalData: stoab(btoa(password)),
            tagLength: 128, 
        },
        key, 
        stoab(encrypted_content) 
      )
    })
    .then((result) => {
      callback(atob(abtos(result)))
    })
    .catch((err) => {
      console.log(err)
      alert('Decrypt failed')
    })
  }

  window.localcrypto = {
    encrypt,
    decrypt,
    abtos,
    stoab
  }
})(window)