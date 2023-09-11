import { createRouter, createWebHistory } from 'vue-router'
import FileDisplay from '../components/FileDisplay.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { requiresAuth: false }
  },
  {
    path: '/home/:id',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
    // children: [
    //   {
    //     path: 'personal',
    //     component: () => import('../components/FileDisplay.vue')
    //   },
    //   {
    //     path: '/home/:id/group/:groupid',
    //     name: 'group',
    //     props: true,
    //     component: () => import('../components/FileDisplay.vue')
    //   }
    // ]
  }
]
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
// router.beforeEach((to, from, next) => {
//   const isLogin = localStorage.login
//   if (to.meta.requiresAuth && isLogin && to.name!='login') {
//     return {
//       name: 'login'
//     }
//   } else {
//     next()
//   }
// })
export default router
