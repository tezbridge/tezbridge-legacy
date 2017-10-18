(function(){
  var abtos = function(arrayBuffer){
    return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
  }
  var stoab = function(base64){
    var binary_string =  window.atob(base64)
    var len = binary_string.length
    var bytes = new Uint8Array(len)
    for (var i = 0; i < len; i++)        {
      bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes.buffer
  }

  var encrypt = function(password, content, callback){
    var iv = window.crypto.getRandomValues(new Uint8Array(12))
    window.crypto.subtle.generateKey(
        {name: "AES-GCM", length: 256},
        true, ["encrypt"])
    .then(function(aesKey){
      var encrypt_content = window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
          additionalData: stoab(btoa(password)),
          tagLength: 128, 
        },
        aesKey,
        stoab(btoa(content))
      )
      var export_key = window.crypto.subtle.exportKey(
        "raw", 
        aesKey
      )
      return Promise.all([encrypt_content, export_key])
    })
    .then(function(result){
      callback([abtos(result[0]), abtos(result[1]), abtos(iv)])
    })
    .catch(function(err){
      console.log(err)
      alert('Current browser does not support web crypto api')
    })
  }

  var decrypt = function(password, encrypted_data_array, callback){
    var encrypted_content = encrypted_data_array[0]
    var key = encrypted_data_array[1]
    var iv = encrypted_data_array[2]

    window.crypto.subtle.importKey(
      "raw", 
      stoab(key),
      {
        name: "AES-GCM",
      },
      false, 
      ["decrypt"]
    )
    .then(function(key){
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
    .then(function(result){
      callback(atob(abtos(result)))
    })
    .catch(function(err){
      console.log(err)
      alert('Decrypt failed')
    })
  }

  window.localcrypto = {
    disabled: !(window.crypto && window.crypto.getRandomValues),
    encrypt: encrypt,
    decrypt: decrypt
  }
})();