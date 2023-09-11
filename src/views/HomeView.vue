<script lang="ts">
import FileDisplay from '@/components/FileDisplay.vue';
import DiaLog from '../components/DiaLog.vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { server } from '../utils/server'
import { aes_keygen, sendExchangeKeyRequest } from '../utils/exchange_key'
import JSEncrypt from 'jsencrypt';
var au = false
export default {
  props: {

  },
  components: {
    FileDisplay,
    DiaLog,
  },
  created() {
    //获得页面需要的数据
    this.setuserdata()
    this.setgrouplist()
    console.log(localStorage)
    if (localStorage.getItem("privatekey" + this.userid) == null) {
      /* eslint-disable no-constant-condition */
      this.showDialog()
    } else {
      return
    }
  },
  watch: {

  },
  mounted() {
    //对dom节点进行操作
    this.getfilelist(null, null, this.userid, null)
  },
  data() {
    return {
      grouplist: [] as { admin: boolean, groupid: string, groupname: string, adminid: string }[],
      userid: '' as string | string[],
      username: '' as string,
      /**filelist格式
      * reqgroupid: "2828"
      * userIsThisGroupAdmin: true
      * filemsg:[{fileid:555,filename:"55555"},
      *          {fileid:888,filename:"88888"},]
      */
      filelist: {} as { currentgroupid: string | null, currentgroupname: string | null, userIsThisGroupAdmin: boolean, filemsg: { fileid: number, filename: string }[] },
      Visible: false,
      AddGroupWindowVisible: false,
      //存在local
      privatekey: '' as string | null
    }
  },
  methods: {
    /**
     * 
     */
    setuserdata() {
      this.userid = this.$route.params.id

    },
    gotouserhome(id: string | string[]) {
      //拿到个人文件不需要groupid和adminid
      this.getfilelist(null, null, id, null)
    },
    // gotoGroup(groupid: string) {
    //   alert('1')
    //   this.getfilelist(groupid)
    //   this.$router.push({ name: 'group', query: { groupid } })
    // },
    /** 
     * 登出
    */
    async logout() {
      await axios.post(server + "logOut", {
        params: {
          id: this.userid
        }
      }).then((res) => {

      }).catch(
        (error) => {
          console.log(error)
        }
      )
      this.$router.push({ name: 'login' })
    },
    setgrouplist() {
      axios.post(server + "getGroupsOfUser", {
        params: {
          userid: this.userid
        }
        //
      }).then((res) => {
        this.username = res.data.username
        this.grouplist = res.data.groups // 可能是undefined但是没有关系
        console.log(this.grouplist)
      }).catch(
        (error) => {
          console.error(error, "an error happened in setgrouplist()")
        })
    },
    /**
     * 
     * 设置filedisplay信息
     */
    getfilelist(groupid: string | null, groupname: string | null, userid: string | string[], adminid: string | null) {
      //个人空间文件列表

      if (groupid === null && adminid === null) {
        //没有组id自然不是管理员
        this.filelist.currentgroupid = null
        this.filelist.currentgroupname = null
        this.filelist.userIsThisGroupAdmin = false
        axios.post(server + "getfilelist", {
          params: {
            userid: this.userid,
            groupid: null
          }
        })
          .then((res) => {
            this.filelist.filemsg = res.data.documents
          }).catch()
      } else {
        //组内文件列表，默认不是管理员
        this.filelist.userIsThisGroupAdmin = false
        // console.log(this.filelist.userIsThisGroupAdmin)
        this.filelist.currentgroupid = groupid
        this.filelist.currentgroupname = groupname
        if (userid == adminid) {
          //是管理员
          this.filelist.userIsThisGroupAdmin = true
          // console.log(this.filelist.userIsThisGroupAdmin)
        }
        axios.post(server + "getfilelist", {
          params: {
            userid: this.userid,
            groupid: groupid
          }
        })
          .then((res) => {
            this.filelist.filemsg = res.data.documents
          }).catch((error) => {

          })
      }
    },
    showDialog() {
      this.Visible = true
    },
    closeDialog() {
      this.Visible = false
    },
    showAddYourGroup() {
      this.AddGroupWindowVisible = true
    },
    closeAddYourGroup() {
      this.AddGroupWindowVisible = false
    },
    handlePrivateKeyChange(event: any) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.privatekey = reader.result as string;
        localStorage.setItem("privatekey" + this.userid, this.privatekey as string)
        // localStorage.setItem("privatekey" + this.userid, reader.result as string)
        console.log('Private key file uploaded and stored.');
      };
      reader.readAsText(file);
    },
    async createNewGroup(userid: string) {
      const groupNameInputElement = document.getElementById("newgroupname") as HTMLInputElement;
      const groupNameInputValue = groupNameInputElement.value;
      console.log(groupNameInputValue);
      if (groupNameInputValue === "") {
        alert("未输入待建组名，请重试");
        return;
      }
      const personalKey = this.privatekey;
      if (personalKey === null) {
        this.showDialog();
        return;
      }
      try {
        const AESkeyEncrypted = await this.getAndEncryptAESKey();//用建组人的RSA的公钥加密的他自己生成的初始的aeskey组文件密钥
        // console.log("创建组");
        // console.log(AESkeyEncrypted)
        const result = await axios.post(server + "createGroup", {
          groupName: groupNameInputValue,
          adminId: userid,
          privateKey: AESkeyEncrypted,//创始人（管理员）RSA公钥加密的他的AES密钥
        })
        alert(result.data.message);
        this.closeAddYourGroup()
        this.setgrouplist()
      } catch (error) {
        console.error(error);
        alert("发生错误，请重试");
      }
    },
    async getAndEncryptAESKey(): Promise<string> {
      try {
        const res = await axios.post(server + "get_private_key", {
          params: {
            userid: this.userid,
            groupid: null,
          }
        });
        let publicKeyPem = res.data.publicKey
        if (publicKeyPem === null) {
          alert("获取你的公钥为空，请重试");
          throw new Error("获取你的公钥为空");
        }
        console.log(publicKeyPem)
        const jsencrypt = new JSEncrypt();
        jsencrypt.setPublicKey(publicKeyPem);
        //第一次建组时生成的aeskey
        const aes_first_generated = aes_keygen();
        console.log("aes_first_generated", aes_first_generated)
        const AESkeyEncrypted = jsencrypt.encrypt(aes_first_generated)
        console.log("AESkeyEncrypted", AESkeyEncrypted)
        if (AESkeyEncrypted == false) {
          console.log(false)
          return 'false'
        } else {
          return AESkeyEncrypted;
        }
        // return AESkeyEncrypted;
      } catch (error) {
        console.error(error);
        alert("获取你的公钥失败，请重试");
        throw error;
      }
    }
  }
};
// import { computed, onMounted, ref } from 'vue'
// const isDialogVisible = ref(false)
// const openDialog = () => {
//   isDialogVisible.value = true
// }
// const closeDialog = () => {
//   isDialogVisible.value = false
// }
// function download() {
//   alert("2")
// }
// const ls = ref([])
// const upload = () => {
//   alert("1")
// }
// const i = (int: number) => {
//   let ii = int
// }

// onMounted(() => {
//   i(0)
// })
// const res = () => {

// }

</script>

<template>
  <div class="top-bar">
    <h2 @click="getfilelist(null, null, userid, null)">欢迎！{{ username }} userid:{{ userid }}</h2>
    <h2 @click="logout()">登出</h2>
  </div>
  <div class="home-container">

    <div class="side-bar">
      <ul>
        <div v-for="(group, index) of grouplist" v-bind:key="index" class="groups-container">
          <div class="group-box" :class="{ 'admin-bg': group.admin }">
            <!-- <router-link class="router-link" to="home/:id/group/:groupid">{{ $route.params.groupid }}</router-link> -->
            <!-- <h2 @click="gotoGroup(group.groupid)">{{ group.groupid }}</h2> -->
            <h2 @click="getfilelist(group.groupid, group.groupname, userid, group.adminid)">{{ group.groupname }}</h2>
          </div>
        </div>

        <div>
          <h3 @click="showAddYourGroup()" class="button">新建组</h3>
        </div>
      </ul>
    </div>
    <div class="files">
      <div class="operations">
        <div class="files-display">
          <!--传入一个列表-->
          <FileDisplay :params="filelist"></FileDisplay>
        </div>
      </div>

    </div>
  </div>
  <!--在localStorage没有私钥时，弹出选择私钥的窗口-->
  <DiaLog :showDialog="Visible" @close="closeDialog">
    <!-- Content of the dialog goes here -->
    <h2>选择你的本地私钥</h2>
    <input type="file" id="newfile" @change="handlePrivateKeyChange" />
  </DiaLog>
  <DiaLog :showDialog="AddGroupWindowVisible" @close="closeAddYourGroup()">
    <span>新建一个你的小组</span>
    <input type="text" id="newgroupname">
    <button @click="createNewGroup(userid as string)">确认</button>
  </DiaLog>
</template>

<style scoped>
.home-container {
  display: grid;
  grid-template-columns: 200px 1fr;
  /* 调整侧边栏的宽度 */
  height: 100vh;
  /* 使用视口的全部高度 */
  z-index: 2;
}

.top-bar {
  background-color: #668fb5;
  color: white;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  /* 将注销按钮和用户ID分开显示 */
  align-items: center;
  /* 垂直居中 */
  z-index: 2;
}

.top-bar h2 {
  cursor: pointer;
  margin: 0;
  z-index: 2;
}

.side-bar {
  background-color: #4c5e6f;
  color: white;
  padding: 20px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 20px;
  z-index: 2;
}

.side-bar h2 {
  cursor: pointer;
  margin: 0;
  z-index: 2;
}

.groups-container {
  overflow-y: auto;
  /* 如果组太多，启用垂直滚动 */
  z-index: 2;
}

.group-box {
  padding: 10px;
  background-color: #444;
  border-radius: 5px;
  cursor: pointer;
  z-index: 2;
}

ul {
  margin: 0;
  z-index: 2;
}

.files {
  padding: 20px;
  height: calc(100vh - 40px);
  /* 剩余高度减去顶部和底部的填充 */
  overflow-y: auto;
  /* 如果文件太多，启用垂直滚动 */
  z-index: 2;
}

.operations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}

.files-display {
  max-width: 100%;
  overflow-x: auto;
  /* 如果文件列表太宽，启用水平滚动 */
  z-index: 2;
}

/* 样式DiaLog组件的对话框 */
.dia-log {
  background-color: rgba(0, 0, 0, 0.7);
  /* 半透明黑色背景 */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  /* 在最顶层显示 */
  z-index: 2;
}

.dialog-box {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.dialog-box h2 {
  margin: 0;
  z-index: 2;
}

.admin-bg {
  background-color: green;
  /* 设置管理员的背景颜色为绿色 */
}
</style>