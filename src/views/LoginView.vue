<template>
    <div class="form-container">
        <h2>登录</h2>
        <form @submit.prevent="login" class="form">
            <!-- 选择登录方式 -->
            <div class="login-method">
                <label>
                    <input type="radio" v-model="loginMethod" value="username" /> 密码登录
                </label>
                <label>
                    <input type="radio" v-model="loginMethod" value="email" /> 邮箱登录
                </label>
                <label>
                    <input type="radio" v-model="loginMethod" value="forgotPassword" /> 找回密码
                </label>
            </div>

            <!-- 根据选择显示对应的输入字段 -->
            <div v-if="loginMethod === 'username'" class="form-group">
                <label for="username">用户名/邮箱:</label>
                <input type="text" v-model="username" id="username" class="form-control" required>
                <!-- 共用密码输入字段 -->
                <label for="password">密码:</label>
                <input type="password" v-model="password" id="password" class="form-control" required>
                <button type="submit" class="button">登录</button>
            </div>

            <div v-else-if="loginMethod === 'email'" class="form-group">
                <label for="email">邮箱:</label>
                <input type="email" v-model="email" id="email" class="form-control" required>
            </div>

            <!-- 如果选择邮箱登录，不需要密码 -->
            <div v-if="loginMethod === 'email'" class="form-group">
                <label for="emailCode">输入验证码:</label>
                <input type="text" v-model="emailCode" id="emailCode" class="form-control" required>
                <button @click="sendEmailCode" class="button">发送验证码</button>
                <button type="submit" class="button">登录</button>
            </div>

            <!-- 忘记密码选项 -->
            <div v-if="loginMethod === 'forgotPassword'">
                <div v-if="step === 1" class="form-group">
                    <label for="forgotPasswordEmail">输入邮件地址：</label>
                    <input type="email" v-model="forgotPasswordEmail" id="forgotPasswordEmail" class="form-control"
                        required>
                    <button @click="sendForgotPasswordEmail" class="button">下一步</button>
                </div>
                <div v-if="step === 2" class="form-group">
                    <label for="forgotPasswordCode">输入验证码：</label>
                    <input type="text" v-model="forgotPasswordCode" id="forgotPasswordCode" class="form-control" required>
                    <button @click="verifyForgotPasswordCode" class="button">下一步</button>
                </div>
                <div v-if="step === 3" class="form-group">
                    <label for="newPassword">设置新密码：</label>
                    <input type="password" v-model="newPassword" id="newPassword" class="form-control" required>
                    <label for="confirmNewPassword">确认新密码：</label>
                    <input type="password" v-model="confirmNewPassword" id="confirmNewPassword" class="form-control"
                        required>
                    <button @click="resetPassword" class="button">重置密码</button>
                </div>
            </div>

            <!-- 添加文件选择框 -->
            <div v-if="loginSuccess" class="form-group">
                <label for="privateKeyFile">请选择私钥文件:</label>
                <input type="file" id="privateKeyFile" @change="handlePrivateKeyFile" accept=".pem" />
            </div>
        </form>

        <!-- 找回密码成功的弹窗 -->
        <b-modal id="resetPasswordSuccessModal" title="密码重置成功" v-model="resetPasswordSuccess">
            <p>{{ resetPasswordMessage }}</p>
        </b-modal>
    </div>
</template>

<script lang="ts">
import axios from 'axios';
import { useRouter } from 'vue-router';
import { server } from '../utils/server'
export default {
    data() {
        return {
            loginMethod: 'username', // 默认选择账号密码登录
            username: '',
            email: '',
            emailCode: '', // 邮箱验证码
            password: '',
            loginSuccess: false, // 登录成功标志
            forgotPasswordEmail: '', // 用于存储找回密码的邮箱地址
            forgotPasswordCode: '', // 用于存储找回密码的验证码
            resetPasswordSuccess: false, // 找回密码成功标志
            resetPasswordMessage: '', // 存储找回密码成功的消息
            step: 1, // 用于跟踪忘记密码的步骤
        };
    },
    methods: {
        async login() {
            try {
                if (this.loginMethod === 'username') {
                    const response = await this.submitLoginData({ username: this.username, pwd: this.password });
                    this.handleLoginResponse(response);
                } else if (this.loginMethod === 'email') {
                    const response = await this.submitLoginData({ address: this.email, code: this.emailCode });
                    this.handleLoginResponse(response);
                }
                // Add code to handle 'forgotPassword' login method here
            } catch (error) {
                console.error('Login failed:', error);
                this.showPopup(error.response.status, error.response.data.message);
            }
        },
        async sendEmailCode() {
            // 在实际应用中，应该向后端发送请求来发送邮箱验证码
            console.log('Sending email verification code to:', this.email);
            try {
                const response = await axios.post(server + 'addressSend', {
                    address: this.email,
                });
                console.log('Email sent successfully:', response.data);
            } catch (error) {
                console.error('Sending email code failed:', error);
                this.showPopup(error.response.status, error.response.data.message);
            }
        },
        async sendForgotPasswordEmail() {
            try {
                const response = await axios.post(server + 'reset1', {
                    address: this.forgotPasswordEmail,
                });
                // 后端应返回一个标识符（例如，success: true），表示成功发送邮件
                if (response.data) {
                    this.step = 2; // 切换到第二步
                } else {
                    // 处理发送邮件失败的情况，例如显示错误信息
                    this.showPopup(response.status, response.data.message);
                }
            } catch (error) {
                console.error('Sending forgot password email failed:', error);
                this.showPopup(error.response.status, error.response.data.message);
            }
        },

        async verifyForgotPasswordCode() {
            try {
                const response = await axios.post(server + 'reset2', {
                    address: this.forgotPasswordEmail,
                    code: this.forgotPasswordCode,
                });
                // 后端应返回一个标识符（例如，success: true），表示验证码验证成功
                if (response.data) {
                    this.step = 3; // 切换到第三步
                } else {
                    // 处理验证码验证失败的情况，例如显示错误信息
                    this.showPopup(response.status, response.data.message);
                }
            } catch (error) {
                console.error('Verifying forgot password code failed:', error);
                this.showPopup(error.response.status, error.response.data.message);
            }
        },

        async resetPassword() {
            if (this.newPassword !== this.confirmNewPassword) {
                alert('Passwords do not match.');
                return;
            }
            try {
                const response = await axios.post(server + 'reset3', {
                    address: this.forgotPasswordEmail,
                    pwd: this.newPassword,
                    confirmNewPassword: this.confirmNewPassword,
                });
                // 后端应返回一个标识符（例如，success: true），表示密码重置成功
                if (response.data) {
                    this.resetPasswordSuccess = true;
                    this.resetPasswordMessage = '密码重置成功';
                } else {
                    // 处理密码重置失败的情况，例如显示错误信息
                    this.showPopup(response.status, response.data.message);
                }
            } catch (error) {
                console.error('Resetting password failed:', error);
                this.showPopup(error.response.status, error.response.data.message);
            }
        },

        handlePrivateKeyFile(event) {
            const file = event.target.files[0];
            if (file) {
                // 读取私钥文件内容
                const reader = new FileReader();
                reader.onload = () => {
                    // 将私钥内容存储到localStorage中
                    localStorage.setItem('privateKey', reader.result);
                    console.log('Private key file uploaded and stored.');
                };
                reader.readAsText(file);
            }
        },
        async submitLoginData(data) {
            try {
                let endpoint = '';

                if (this.loginMethod === 'username') {
                    endpoint = 'commandLogin';
                } else if (this.loginMethod === 'email') {
                    endpoint = 'addressVer';
                }

                const response = await fetch(server + endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (response.ok) {
                    const responseData = await response.json();
                    return responseData; // 返回响应数据
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                console.error('Login failed:', error);
            }
        },
        async handleLoginResponse(response) {
            console.log('Response from server:', response);

            if (response.userId) {
                // 登录成功，获取userId
                const userId = response.userId;
                // localStorage.login = true

                // 使用Vue Router的编程式导航来跳转到HomeView并传递userId作为参数
                this.$router.push({ name: 'home', params: { id: userId } });
            } else {
                // 处理登录失败的情况，例如显示错误信息
                this.showPopup(response.status, response.message);
            }
        },
        showPopup(status, message) {
            this.verificationResult = true;
            this.verificationResultMessage = `Status Code: ${status}\nMessage: ${message}`;
        },
    },
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
    /* 设置LoginView为相对定位 */
    z-index: 2;
    /* 设置LoginView的z-index为2，较大的值 */
}

.form {
    max-width: 300px;
    margin: 0 auto;
}

.login-method {
    margin-bottom: 20px;
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
.popup {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 20px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;
    /* 设置弹窗的z-index较大，使其位于最上层 */
}
</style>
