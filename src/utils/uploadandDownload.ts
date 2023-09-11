import axios from 'axios'
import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'
import { encryptAES, decryptAES } from './exchange_key'
import { server } from './server'
// 上传文件并加密
export async function uploadFileToEncrypted(
  comkey: string,
  userid: string,
  groupid: string | null,
  privatekey: string
) {
  console.log(comkey)
  const q = document.getElementById('fileToUpload') as HTMLInputElement
  if (q.files == null) {
    alert('files is null!!')
    console.log('files is null!!')
  } else {
    const file = q.files[0]
    const reader = new FileReader()
    let key
    // 获取自己的对称密钥
    if (groupid === null) {
      const keyResponse = await axios.post(server + 'get_private_key', {
        params: {
          userid: userid
        }
      })
      //个人的RSA公钥加密后的个人的AES密钥
      key = keyResponse.data.aeskey
    } else {
      const keyResponse = await axios.post(server + 'get_private_key', {
        params: {
          userid: userid,
          groupid: groupid
        }
      })
      //用个人的RSA公钥加密后的组文件的AES密钥
      key = keyResponse.data.privateKey
    }
    console.log(key)
    // 用自身的公钥获取key
    const crypt = new JSEncrypt()
    crypt.setPrivateKey(privatekey)
    //decryptedKey解密后的
    const decryptedKey = crypt.decrypt(key)
    // console.log("对称",decryptedKey)
    // 测试用
    //const testKey = 'abcdefghijklmnop'

    reader.onload = async (e) => {
      //e.target可能空
      const fileData = e.target?.result as ArrayBuffer
      let encryptedData = encryptAES(new Uint8Array(fileData), decryptedKey)
      // let encryptedData = encryptAES(new Uint8Array(fileData),testKey);
      // 此处对文件进行两次加密，即对象均为二进制串
      // 而此前直接对encryptedData进行加密的方式对象是字符串

      const textEncoder = new TextEncoder()
      // 此时为uintArray
      const encrytemp = textEncoder.encode(encryptedData)
      // .buffer才能有取到对应的ArrayBuffer
      const encrytemparray = encrytemp.buffer
      encryptedData = encryptAES(new Uint8Array(encrytemparray), comkey)

      const blob = new Blob([encryptedData], { type: file.type })
      const blobfile = blob
      //groupid可能传入null
      await uploadf(blobfile, file.name, userid, groupid)
    }

    reader.readAsArrayBuffer(file)
  }
}

// 分片上传文件
export async function uploadf(blob: Blob, name: string, id: string, groupid: string | null) {
  const chunksize = 100 * 1024
  let chunktotal = Math.ceil(blob.size / chunksize)
  let start = 0
  let chunkindex = 1
  const size = blob.size

  while (chunkindex <= chunktotal) {
    const formData = new FormData()
    if (chunkindex < chunktotal) {
      const chunkfile = blob.slice(start, start + chunksize)
      formData.append('file', chunkfile)
    } else {
      const chunkfile = blob.slice(start, size)
      formData.append('file', chunkfile)
    }
    formData.append('name', name)
    formData.append('id', id)
    formData.append('chunkindex', String(chunkindex))
    if (groupid !== null) {
      formData.append('groupid', groupid)
    }

    try {
      const response = await axios.post(server + 'upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      console.log(chunkindex)
      if (response.status === 200) {
        console.log(chunkindex)
        start += chunksize
        chunkindex += 1
      }
    } catch (error) {
      console.error(error)
      break
    }
  }

  const formDataFinal = new FormData()
  formDataFinal.append('name', name)
  formDataFinal.append('id', id)
  if (groupid !== null) {
    formDataFinal.append('groupid', groupid)
  }
  formDataFinal.append('chunktotal', String(chunktotal))

  try {
    const response = await axios.post(server + 'uploadover', formDataFinal)
    if (response.status === 200) {
      alert('上传成功')
    }
  } catch (error) {
    console.error(error)
  }
}

// 下载文件并对文件解密
export async function downloadFile(
  userid: number,
  groupid: number | null,
  fileid: number,
  comkey: string, //会话密钥
  privatekey: string //私钥 在localStorage
) {
  console.log('startdownload')
  try {
    let keyResponse
    let response
    let key
    if (groupid == null) {
      keyResponse = await axios.post(server + 'get_private_key', {
        params: {
          userid: userid.toString()
        }
      })
      response = await axios.post(server + 'getfile', {
        userid: userid.toString(),
        fileid: fileid.toString()
      })
      //得到个人的用自己的RSA公钥加密的aeskey
      key = keyResponse.data.aeskey
    } else {
      keyResponse = await axios.post(server + 'get_private_key', {
        params: {
          userid: String(userid),
          groupid: String(groupid)
        }
      })
      response = await axios.post(server + 'getfile', {
        userid: userid.toString(),
        groupid: groupid.toString(),
        fileid: fileid.toString()
      })
      //得到组的用自己的RSA公钥加密的aeskey
      key = keyResponse.data.privateKey
    }
    // 用自身的私钥获取解密后的AESkey
    const crypt = new JSEncrypt()
    //私钥 在localStorage
    crypt.setPrivateKey(privatekey)
    //解密后的AESkey
    console.log('download', key)
    const decryptedAESKey = crypt.decrypt(key)
    console.log('对称', decryptedAESKey)
    // 测试用，后续服务器端需要完善获取key的get_private_key函数
    // const testKey = 'abcdefghijklmnop'

    if (response.status === 200) {
      console.log(response)
      let filedata = atob(response.data.filestream)
      console.log(comkey)
      const temp = decryptAES(filedata, comkey)

      // 此处filedata解密后为Arraybuffer类型
      // 为了第二次加密与第一次加密的一致性，把filedata 解码为字符串进行第二次解密
      const textDecoder = new TextDecoder('utf-8') // 使用 UTF-8 编码解码
      filedata = textDecoder.decode(temp)
      const res = decryptAES(filedata, decryptedAESKey)
      // let res = decryptAES(filedata, testKey);
      const blob = new Blob([res], { type: response.data.filetype })
      const a = document.createElement('a')
      const href = window.URL.createObjectURL(blob) // 创建下载连接
      a.href = href
      a.download = decodeURI(response.data.filename)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a) // 下载完移除元素
      window.URL.revokeObjectURL(href)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
