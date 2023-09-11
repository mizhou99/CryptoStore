import JSEncrypt from 'jsencrypt'
import * as CryptoJS from 'crypto-js'
import axios from 'axios'
import { server } from './server'
export async function sendExchangeKeyRequest(
  userid: Number,
  privatekey: string
): Promise<string | null> {
  try {
    // Generate a 128-bit random key (please provide your aes_keygen implementation)
    const communicatekey = aes_keygen()
    console.log('userid', userid)
    // Server's public key
    const publicKey = `-----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxhGfosc4lafTRti/U7uY
      C6KwNU7Pj+oygqyI4Q+tkC3nGAG5XB1bU6AFSpnsXLbnhelbIz0uOpRbukGobpT4
      zI+YCkOQwiaFJh/d5yPHhlfXu1JdsYYjdk2CK6HRzZDpwGZPEr5smPBO0q6yqjVY
      EnsG8hHmUOGKcXmSwcWurrmuD1thV77c6GDE9GPpXVLFLaQCymSkQ5HlGddPl2rR
      STJEZ2gKBaqhK+K7RjcOnNx5Q4jUQ7zDXqX+66GJyQluGntQc/fyKwwy0o8Ks5T3
      G/mcbRmVUYaWwfwY/+yKgA40dyUY8cfrNSV7AIM3pvu40ndtNo8Dz8Wn0OE5GE1I
      QQIDAQAB
      -----END PUBLIC KEY-----`

    // Initialize JSEncrypt with the public key
    const encrypt = new JSEncrypt()
    encrypt.setPublicKey(publicKey)

    // Encrypt the userid and communicatekey
    const encryptedUserId = encrypt.encrypt(String(userid))
    const encryptedKey = encrypt.encrypt(communicatekey)

    // Make the POST request using Axios
    console.log(userid, encryptedUserId)
    const response = await axios.post(server + 'exchange_key', {
      userid: encryptedUserId,
      key: encryptedKey
    })

    // Handle the response
    const respData = response.data
    // Check if privatekey is provided
    if (privatekey == null) {
      alert('请选择自身私钥')
      return null
    }

    // Initialize JSEncrypt with the private key
    const decrypt = new JSEncrypt()
    console.log(privatekey)
    decrypt.setPrivateKey(privatekey)

    // Decrypt the response
    const decryptedData = decrypt.decrypt(respData.data)
    console.log(decryptedData)
    if (decryptedData === communicatekey + '1') {
      console.log('交换成功')
      return communicatekey
    } else {
      alert('交换失败')
      return null
    }
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export function aes_keygen() {
  const aes_key: string[] = []
  for (let j = 0; j < 16; j++) {
    const tmp = Math.random().toString(36).substring(2, 3)
    aes_key.push(tmp)
  }
  const res = aes_key.join('')
  return res
}

export function arrayBufferToWordArray(arrayBuffer: ArrayBuffer): CryptoJS.lib.WordArray {
  const u8 = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength)
  const len = u8.length
  const words: number[] = []

  for (let i = 0; i < len; i += 1) {
    words[i >>> 2] |= (u8[i] & 0xff) << (24 - (i % 4) * 8)
  }

  return CryptoJS.lib.WordArray.create(words, len)
}

export function wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
  const words = wordArray.words
  const sigBytes = wordArray.sigBytes
  const u8 = new Uint8Array(sigBytes)

  for (let i = 0; i < sigBytes; i++) {
    const byte = (words[i >> 2] >> (24 - (i % 4) * 8)) & 0xff
    u8[i] = byte
  }

  return u8.buffer // Convert Uint8Array to ArrayBuffer
}

export function encryptAES(text: any, key: any) {
  // console.log(text)
  key = CryptoJS.enc.Utf8.parse(key)
  const wordbuffer = CryptoJS.lib.WordArray.create(text)
  const encrypted = CryptoJS.AES.encrypt(wordbuffer, key, {
    mode: CryptoJS.mode.ECB, // 使用ECB模式
    padding: CryptoJS.pad.Pkcs7 // 使用PKCS7填充
  })
  return encrypted.toString()
}

// 定义AES解密函数
export function decryptAES(ciphertext: any, key: any) {
  //   将密钥转换为WordArray
  //  const keyWordArray = CryptoJS.enc.Utf8.parse(key);
  //   解密
  //   wordbuffer=CryptoJS.lib.WordArray.create(ciphertext)
  key = CryptoJS.enc.Utf8.parse(key)
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
    mode: CryptoJS.mode.ECB, // 使用ECB模式
    padding: CryptoJS.pad.Pkcs7 // 使用PKCS7填充
  })
  const arrayBuffer = wordArrayToArrayBuffer(decrypted)
  return arrayBuffer
}
