<template>
    <div class="filedisplay">
        <div v-for="(fileobject, index) in params.filemsg" v-bind:key="index" class="file-container">
            <div class="file-box" @click="download(fileobject['id'])">
                <div class="file-icon">
                    <img src="/src/assets/file.png" alt="File Icon">
                </div>
                <div class="file-name">
                    {{ fileobject["name"] }}
                </div>
            </div>
            <button class="delete-file-button" @click="deletefile(fileobject['id'], params.currentgroupid)">删除文件</button>
        </div>
        <button @click="showUpLoad()" class="button">上传文件</button>
        <DiaLog :showDialog="upLoadWindowVisible" @close="closeUpLoad">
            <input id="fileToUpload" type="file">
            <button @click="upload()">确认上传</button>
        </DiaLog>
        <div v-if="params.userIsThisGroupAdmin == true">
            <!--是否显示管理员可用操作-->
            <button @click="showAdminDialog">组管理</button>
        </div>
        <DiaLog :showDialog="AdminOperationVisible" @close="closeAdminDialog">
            <!-- Content of the dialog goes here -->
            <h3>组成员列表:</h3>
            <div v-for="(memberinfo, index) of membersInGroup" v-bind:key="index">
                <div>
                    <span>{{ memberinfo.userName }}</span>
                    <button class="deleteUserInGroup"
                        @click="deleteUser(memberinfo.userId, memberinfo.groupId)">删除用户</button>
                </div>
            </div>
            <h3>添加组成员(输入id)</h3>
            <input type="text" id="member-to-group">
            <button @click="addMemberToGroup()">确认</button>
        </DiaLog>

    </div>
</template>

<script lang="ts">
import axios from 'axios'
import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import DiaLog from './DiaLog.vue';
import { sendExchangeKeyRequest, aes_keygen } from '../utils/exchange_key'
import { uploadFileToEncrypted, downloadFile } from '../utils/uploadandDownload';
import { server } from '../utils/server';
export default {
    components: {
        DiaLog,
    },
    props: {
        //first { currentgroupid: null, currentgroupname:null, userIsThisGroupAdmin: false, filemsg: { fileid: number, filename: string }[] }
        //secend {}
        params: {
            type: Object,
            default: () => {
                return {}
            }
        },
    },
    data() {
        return {
            // files: [] as { fileid: number, filename: string }[],
            // reqGid: '' as string | null
            userid: '' as string | string[],
            AdminOperationVisible: false,
            upLoadWindowVisible: false,
            membersInGroup: [] as { groupName: string, groupId: number, userId: number, userName: string }[]
        }
    },
    watch: {
        params: {
            handler(newValue, oldValue) {
                // this.membersInGroup = this.getMembersInGroup()
                // console.log("Inwatch.this.membersInGroup", this.membersInGroup)
                if (newValue['currentgroupid'] != null) {
                    this.getMembersInGroup(newValue['currentgroupid'])
                    console.log("membersInGroupNewValue", this.membersInGroup)
                }
            },
            deep: true,
            immediate: true
        },

    },
    mounted() {
        // this.membersInGroup = this.getMembersInGroup()

    },
    created() {
        this.setid()
    },
    methods: {
        // setfilelist(args: { currentgroupid: string | null, filemsg: { fileid: number, filename: string }[] }) {
        //     this.reqGid = args.currentgroupid
        //     this.files = args.filemsg
        // },
        setid() {
            this.userid = this.$route.params.id
        },
        //封装后的上传
        upload() {
            let ID
            if (typeof this.userid === 'string') {
                ID = Number(this.userid)
            } else {
                ID = Number(this.userid[0])
            }
            const PRIVATE = localStorage.getItem('privatekey' + this.userid) as string
            const GROUPID = this.params.currentgroupid as string | null
            this.uploadFile(ID, GROUPID, PRIVATE)
            // if (GROUPID == null) {
            //     //上传个人文件
            //     this.uploadFile(ID, null, PRIVATE)
            // } else {
            //     //上传组文件
            //     this.uploadFile(ID, GROUPID, PRIVATE)
            // }
        },
        //实际的上传函数 // 传入的GROUPID可能是null
        uploadFile(USERID: number, GROUPID: string | null, PRIVATEKEY: string) {
            try {
                sendExchangeKeyRequest(USERID, PRIVATEKEY).then((result) => {
                    if (result === null) {
                        alert("交换密钥失败")
                    } else {
                        uploadFileToEncrypted(result, String(USERID), GROUPID, PRIVATEKEY);
                    }
                });
            } catch (error) {
                console.error('上传失败', error);
                alert('上传失败');
            }
        },
        showAdminDialog() {
            this.AdminOperationVisible = true
        },
        closeAdminDialog() {
            this.AdminOperationVisible = false
        },
        showUpLoad() {
            this.upLoadWindowVisible = true
        },
        closeUpLoad() {
            this.upLoadWindowVisible = false
        },
        //封装后的下载，调用handleDownloadClick
        download(fileid: number) {
            //currentgroupid 组id
            //this.userid 用户id
            let ID
            if (typeof this.userid === 'string') {
                ID = Number(this.userid)
            } else {
                ID = Number(this.userid[0])
            }
            console.log(ID, typeof ID)
            const PRIVATE = localStorage.getItem('privatekey' + this.userid) as string
            console.log("in fun download()", this.params.currentgroupid)
            const GROUPID = this.params.currentgroupid
            this.handleDownloadClick(ID, GROUPID, fileid, PRIVATE)
            // if (GROUPID == null) {
            //     //下载个人文件
            //     this.handleDownloadClick(ID, null, fileid, PRIVATE)
            // } else {
            //     //下载组文件
            //     this.handleDownloadClick(ID, GROUPID, fileid, PRIVATE)
            // }
        },
        //实际的异步下载函数
        handleDownloadClick(USERID: number, GROUPID: number | null, FILEID: number, PRIVATEKEY: string) {
            try {
                alert('download')
                sendExchangeKeyRequest(USERID, PRIVATEKEY).then(
                    (result) => {
                        if (result == null) {
                            alert("交换密钥失败")
                        } else {
                            downloadFile(USERID, GROUPID, FILEID, result, PRIVATEKEY);
                        }
                    });
            } catch (error) {
                console.error('下载失败', error);
                alert('下载失败');
            }
        },

        async addMemberToGroup() {
            const memberToGroupElement = document.getElementById("member-to-group") as HTMLInputElement;
            const memberToGroupValue = memberToGroupElement.value;
            const personalKey = localStorage.getItem("privatekey" + this.userid);

            if (personalKey === null) {
                alert("你的私钥未加载");
                return;
            }

            try {
                const AESkeyDecrypted = await this.getAESKeyDecrypted(personalKey);
                const AESkeyEncryptedToSend = await this.getAESKeyEncryptedForMember(memberToGroupValue, AESkeyDecrypted);

                const response = await this.addUserToGroup(memberToGroupValue, AESkeyEncryptedToSend);

                if (response.status == 200) {
                    alert(response.data.message)
                } else {
                    alert("请求失败")
                }
            } catch (error) {
                console.log(error);
                alert("发生错误，请重试");
            }
        },

        async getAESKeyDecrypted(personalKey: string) {
            try {
                console.log("fun getAESKeyDecrypted", this.params.currentgroupid)
                const response = await axios.post(server + "get_private_key", {
                    params: {
                        userid: this.userid,
                        groupid: this.params.currentgroupid,
                    },
                });

                const jsencrypt1 = new JSEncrypt();
                jsencrypt1.setPrivateKey(personalKey);
                console.log(personalKey)
                return jsencrypt1.decrypt(response.data.privateKey) as string;
            } catch (error) {
                throw new Error("请求组密钥失败");
            }
        },

        async getAESKeyEncryptedForMember(memberToGroupValue: string, AESkeyDecrypted: string) {
            try {
                const response = await axios.post(server + "get_private_key", {
                    params: {
                        userid: memberToGroupValue,
                        groupid: null,
                    },
                });

                const jsencrypt2 = new JSEncrypt();
                jsencrypt2.setPublicKey(response.data.publicKey);
                return jsencrypt2.encrypt(AESkeyDecrypted) as string;
            } catch (error) {
                throw new Error("请求组密钥失败");
            }
        },

        async addUserToGroup(memberToGroupValue: string, AESkeyEncryptedToSend: string) {

            return await axios.post(server + "addUsertoGroup", {
                params: {
                    groupName: this.params.currentgroupname,
                    groupId: this.params.currentgroupid,
                    userId: memberToGroupValue,
                    privateKey: AESkeyEncryptedToSend,
                    adminId: this.userid
                },
            });


        },
        //
        async getMembersInGroup(groupId: number) {
            let user_info = []
            console.log("this.params.currentgroupid" + groupId)
            await axios.post(server + "getUsersInGroup", {
                params: {
                    groupId: groupId
                }
            }).then((res) => {
                console.log("成功获取组成员")
                user_info = res.data.users
                this.membersInGroup = user_info
            }).catch((error) => {
                console.error("获取组成员失败")
            })
            return []
        },
        deleteUser(userToDelete: number, userInGroupId: number) {
            axios.post(server + "deleteuserfromgroup", {
                params: {
                    userId: String(userToDelete),
                    groupId: String(userInGroupId)
                }
            }).then((res) => {
                if (res.status == 200) {
                    alert(res.data.message)
                    this.getMembersInGroup(userInGroupId)
                } else if (res.status == 401) {
                    alert(res.data.message)
                } else {
                    console.error("请求服务器失败")
                }
            }).catch((error) => {

            })
        },
        deletefile(fileid: number, groupid: number | null) {
            axios.post(server + "deletefile", {
                params: {
                    groupId: groupid,
                    documentId: fileid,
                    userId: this.userid
                }
            }).then((res) => {
                if (res.status == 200) {
                    alert(res.data.message)
                } else if (res.status == 400) {
                    alert(res.data.message)
                } else {
                    alert("请求服务器失败")
                    console.error("请求服务器失败")
                }
                this.$router.go(0)
            }).catch((error) => {
                console.log(error);
            })
        }
    },



}
    // watch: {
    //     params: {
    //         handler(oldValue, newValue) {
    //             for (let i = 0; i < newValue.length; i++) {

    //                 // if (oldValue[i] != newValue[i]) {
    //                 //     console.log(newValue)
    //                 //     //newvalue is Object
    //                 //     this.setfilelist(newValue)
    //                 // }
    //                 console.log(newValue)
    //                  //newvalue is Object
    //                 this.setfilelist(newValue)
    //             }
    //         },
    //         deep: true,
    //     },
    // },

    // watch: {
    //     '$route.params': {
    //         handler() {
    //             this.getfilelist();
    //         },
    //         immediate: true, // 立即调用处理程序以处理初始路由参数
    //     },
    // },



</script>

<style>
.filedisplay {
    z-index: 2;
}

.file-container {
    width: 100%;
    z-index: 2;
}

.file-box {
    display: flex;
    align-items: center;
    padding: 10px;
    border: 1px solid #f7e0e0;
    /* 添加边框样式 */
    border-radius: 4px;
    background-color: #fef3f3;
    z-index: 2;
}

.file-icon img {
    width: 30px;
    /* 根据需要调整图标的大小 */
    margin-right: 10px;
    /* 可根据需要调整图标与文本之间的间距 */
    z-index: 2;
}

.file-name {
    flex-grow: 1;
    /* 让文件名框占据剩余的空间 */
    font-family: 宋体, SimSun, sans-serif;
    /* 使用宋体字体 */
    font-size: 24px;
    /* 设置四号字体大小 */
    text-align: left;
    /* 文字左对齐 */
    color: #110202;
    /* 文字颜色为白色，可根据需要调整颜色 */
    background-color: #fef3f3;
    z-index: 2;
}

.button {
    background-color: #007bff;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    z-index: 2;
}
</style>