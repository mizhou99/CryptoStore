<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <router-link to="/" class="navbar-brand">磁盘共享管理系统</router-link>
        <ul class="navbar-nav">
          <!-- 使用v-if来控制登录和注册链接的显示与隐藏 -->
          <li class="nav-item" v-if="showLoginRegisterLinks">
            <router-link to="/login" class="nav-link">登录</router-link>
          </li>
          <li class="nav-item" v-if="showLoginRegisterLinks">
            <router-link to="/register" class="nav-link">注册</router-link>
          </li>
        </ul>
      </div>
    </nav>

    <div class="container">
      <router-view></router-view>
      <canvas id="canvas"></canvas>
    </div>

    <footer class="footer">
      <div class="container">
        &copy; 2023 磁盘共享管理系统
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      showLoginRegisterLinks: true,
      beforeUnload_time: 0,
      gap_time: 0
    };
  },
  watch: {
    $route(to, from) {
      // 根据路由切换来更新showLoginRegisterLinks的值
      if (to.matched.some((record) => record.meta.requiresAuth)) {
        this.showLoginRegisterLinks = false;
      } else {
        this.showLoginRegisterLinks = true;
      }
    },
  },

  mounted() {

    this.setupCanvas(); // 在组件挂载时调用设置Canvas的方法
    // window.addEventListener('beforeunload', e => this.beforeunloadHandler())
    // window.addEventListener('unload', e => this.unloadHandler(e))
  },
  // unmounted() {
  //   window.removeEventListener('beforeunload', e => this.beforeunloadHandler())
  //   window.removeEventListener('unload', e => this.unloadHandler(e))
  // },
  methods: {
    setupCanvas() {
      // 获取Canvas元素和画笔
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");

      // 设置Canvas宽高
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // 定义粒子数组和数量
      const particlesArray = [];
      const count = parseInt((canvas.width / 80) * (canvas.height / 80));

      // 定义粒子类
      class Particle {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.directionX = Math.random() - 0.5;
          this.directionY = Math.random() - 0.5;
        }

        update() {
          this.x += this.directionX;
          this.y += this.directionY;
        }

        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = "white";
          ctx.fill();
        }
      }

      function createParticle() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
      }

      function handleParticle() {
        for (let i = 0; i < particlesArray.length; i++) {
          const particle = particlesArray[i];
          particle.update();
          particle.draw();
          if (
            particle.x < 0 ||
            particle.x > canvas.width ||
            particle.y < 0 ||
            particle.y > canvas.height
          ) {
            particlesArray.splice(i, 1);
          }

          for (let j = i + 1; j < particlesArray.length; j++) {
            const dx = particlesArray[j].x - particlesArray[i].x;
            const dy = particlesArray[j].y - particlesArray[i].y;
            const dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
            if (dist < 100) {
              ctx.beginPath();
              ctx.strokeStyle = "rgba(94, 136, 235, " + (1 - dist / 100);
              ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
              ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
              ctx.closePath();
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (particlesArray.length < count) {
          createParticle();
        }
        handleParticle();
        requestAnimationFrame(draw);
      }

      draw();
    },

    // beforeunloadHandler() {
    //   this.beforeUnload_time = new Date().getTime()
    // },
    // unloadHandler(e) {
    //   console.log(e)
    //   e = e || window.Event
    //   this.gap_time = new Date().getTime() - this.beforeUnload_time
    //   //判断是窗口关闭还是刷新
    //   if (this.gap_time <= 5) {
    //     //如果是登录状态，关闭窗口前，移除用户
    //     localStorage.removeItem('login')
    //     console.log(localStorage)
    //   }
    // },
  },
};
</script>

<style>
/* 整体页面样式 */
#app {
  font-family: 'Arial', sans-serif;
  background-color: #ffffff;
  min-height: 100vh;
  /* 设置最小高度为视口高度 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  /* 垂直方向上元素分布 */
  position: relative;
  /* 设置父容器为相对定位 */
}

/* 导航栏样式 */
.navbar {
  background-color: #4d7397;
  color: #fff;
}

.navbar-brand {
  font-size: 36px;
  /* 调整字体大小为较大值，可以根据需要进行调整 */
  font-weight: bold;
  text-decoration: none;
  color: #fff;
  display: flex;
  /* 使用 Flex 布局 */
  align-items: center;
  /* 垂直居中 */
  justify-content: center;
  /* 水平居中 */
}

.navbar-nav {
  list-style: none;
  display: flex;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin-right: 20px;
}

.nav-link {
  text-decoration: none;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
}

.nav-link:hover {
  text-decoration: underline;
}

/* 内容区域样式 */
.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}

/* 页脚样式 */
.footer {
  background-color: #4d7397;
  color: #fff;
  text-align: center;
  padding: 10px 0;
  z-index: 2;
  /* 提升页脚的z-index，使其位于Canvas之上 */
}

#canvas {
  position: absolute;
  /* 设置Canvas为绝对定位 */
  top: 70px;
  left: 0;
  z-index: 1;
  /* 设置Canvas的z-index为1，较小的值 */
}
</style>

