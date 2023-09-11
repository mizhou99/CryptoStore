<template>
    <div class="form-container">
        <h2>用户注册</h2>

        <!-- 第一步：输入邮箱 -->
        <div v-if="step === 1">
            <form @submit.prevent="sendEmail" class="form">
                <div class="form-group">
                    <label for="email">邮箱：</label>
                    <input type="email" v-model="email" id="email" class="form-control" required>
                </div>
                <button type="submit" class="button">继续</button>
            </form>
        </div>

        <!-- 第二步：输入验证码 -->
        <div v-if="step === 2">
            <!-- 认证代码输入 -->
            <form @submit.prevent="verifyCode" class="form">
                <div class="form-group">
                    <h3>验证</h3>
                    <p>输入验证码：</p>
                    <input type="text" v-model="verificationCode" id="verificationCode" class="form-control" required>
                    <button type="submit" class="button">继续</button>
                </div>
            </form>
        </div>

        <!-- 第三步：输入用户名和密码 -->
        <div v-if="step === 3">
            <form @submit.prevent="register" class="form">
                <div class="form-group">
                    <label for="username">用户名:</label>
                    <input type="text" v-model="username" id="username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="password">设置密码:</label>
                    <input type="password" v-model="password" id="password" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">确认密码:</label>
                    <input type="password" v-model="confirmPassword" id="confirmPassword" class="form-control" required>
                </div>
                <button type="submit" class="button">注册</button>
            </form>
        </div>

        <!-- 注册成功的弹窗 -->
        <div v-if="registrationSuccess" class="verification-popup">
            <p>注册成功！</p>
            <button @click="downloadPrivateKey" class="download-button">下载您的私钥</button>
            <button @click="closeRegistrationSuccessPopup" class="button">关闭</button>
        </div>

    </div>
</template>

<script lang="ts">
import axios from 'axios';
import forge from 'node-forge';
import CryptoJS from 'crypto-js'; // 导入CryptoJS用于AES加密
import JSEncrypt from 'jsencrypt';
import { server } from '../utils/server'
// 随机生成RSA密钥对，128位密钥长度
function generateRSAKeyPair() {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 128 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    return { privateKey: privateKeyPem, publicKey: publicKeyPem };
}

// 随机生成AES对称密钥
function generateAESKey() {
    var aes_key = [];
    for (var j = 0; j < 16; j++) {
        var tmp = Math.random().toString(36).substring(2, 3)
        aes_key.push(tmp);
    }
    var res = aes_key.join("");
    return res;
}

export default {
    data() {
        return {
            email: '',
            username: '',
            password: '',
            confirmPassword: '', // 新增确认密码字段
            verificationCode: '',
            step: 1, // 控制注册步骤
            publicKey: '', // 存储生成的RSA公钥
            privateKey: '', // 存储生成的RSA私钥
            aesKey: '', // 存储生成的AES对称密钥
            verificationResult: false, // 控制验证码验证结果弹窗显示
            verificationResultMessage: '', // 弹窗消息
            registrationSuccess: false, // 控制注册成功弹窗显示
        };
    },
    computed: {
        privateKeyDownloadLink() {
            // 生成Blob对象
            const privateKeyBlob = new Blob([this.privateKey], { type: 'application/octet-stream' });
            // 创建下载链接
            return window.URL.createObjectURL(privateKeyBlob);
        }
    },
    methods: {
        async sendEmail() {
            try {
                const response = await axios.post(server + 'register1', { address: this.email });

                if (response.status === 200) {
                    this.verificationCode = response.data.verificationCode;
                    this.step = 2; // 切换到下一步
                } else {
                    // 非200状态码，显示弹窗
                    this.showPopup(response.status, response.data.message);
                }
            } catch (error) {
                console.error('Error sending email:', error);
                this.showPopup(error.response.status, error.response.data.message);
                // 根据需要处理错误
            }
        },
        async verifyCode() {
            try {
                const response = await axios.post(server + 'register2', { address: this.email, code: this.verificationCode });

                if (response.status === 200) {
                    this.step = 3; // 切换到下一步
                } else {
                    // 非200状态码，显示弹窗
                    this.showPopup(response.status, response.data.message);
                }
            } catch (error) {
                console.error('Error verify email:', error);
                this.showPopup(error.response.status, error.response.data.message);
                // 根据需要处理错误
            }
        },
        async register() {
            // 检查密码是否一致
            if (this.password !== this.confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            // 模拟生成RSA密钥对
            const encrypt = new JSEncrypt()
            const rsaKeyPair = encrypt.getKey()
            this.publicKey = rsaKeyPair.getPublicKey();
            this.privateKey = rsaKeyPair.getPrivateKey();

            // 生成AES对称密钥
            this.aesKey = generateAESKey();
            encrypt.setPublicKey(this.publicKey)
            console.log(typeof (this.aesKey))
            console.log(this.aesKey)
            console.log(this.publicKey)
            const duichenKey = encrypt.encrypt(this.aesKey)

            // 存储私钥和AES对称密钥到localStorage
            localStorage.setItem('privateKey', this.privateKey);

            // 发送注册请求到后端，包括公钥和AES对称密钥
            try {
                const response = await axios.post(server + 'register4', {
                    username: this.username,
                    pwd: this.password,
                    publicKey: this.publicKey,
                    duichenKey: duichenKey, // 将AES密钥发送到后端
                    address: this.email
                });

                if (response.status === 200) {
                    // 标记注册成功并显示弹窗
                    this.registrationSuccess = true;
                } else {
                    // 非200状态码，显示弹窗
                    this.showPopup(response.status, response.data.message);
                }
            } catch (error) {
                console.error('Registration failed:', error);
                this.showPopup(error.response.status, error.response.data.message);
                // 根据需要处理错误
            }
        },

        // 添加下载私钥的方法
        downloadPrivateKey() {
            // 创建Blob对象，使用正确的MIME类型
            const privateKeyBlob = new Blob([this.privateKey], { type: 'application/x-pem-file' });

            // 创建一个下载链接
            const privateKeyDownloadLink = window.URL.createObjectURL(privateKeyBlob);

            // 创建一个虚拟的下载链接元素
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = privateKeyDownloadLink;
            a.download = 'private-key.pem'; // 设置下载文件名

            // 将虚拟链接元素添加到文档中
            document.body.appendChild(a);

            // 模拟点击链接来触发下载
            a.click();

            // 清理创建的元素和URL对象
            window.URL.revokeObjectURL(privateKeyDownloadLink);
            document.body.removeChild(a);
        },
        showPopup(status, message) {
            this.verificationResult = true;
            this.verificationResultMessage = `Status Code: ${status}\nMessage: ${message}`;
        },
        closeVerificationPopup() {
            this.verificationResult = false;
        },
        closeRegistrationSuccessPopup() {
            // 关闭注册成功弹窗并导航到登录界面
            this.registrationSuccess = false;
            this.$router.push({ name: 'login' });
        }
    }
};
</script>


<style scoped>
/* 导入项目中的CSS文件 */
@import '@/assets/styles/styles.css';

/* 继续定义组件的样式 */
.form-container {
    text-align: center;
    margin: 20px;
    position: relative;
    z-index: 2;
}

.form {
    max-width: 300px;
    margin: 0 auto;
}

.form-group {
    margin-bottom: 20px;
}

.form-control {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.button {
    background-color: #007bff;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}

.button:hover {
    background-color: #0056b3;
}

/* 弹窗样式 */
.verification-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.verification-popup p {
    background-color: #fff;
    padding: 20px;
    border-radius: 4px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
    margin-bottom: 20px;
}

.verification-popup button {
    background-color: #007bff;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}

.verification-popup button:hover {
    background-color: #0056b3;
}
</style>