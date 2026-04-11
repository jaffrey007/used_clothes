import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'orders', name: 'Orders', component: () => import('../views/Orders.vue') },
      { path: 'users', name: 'Users', component: () => import('../views/Users.vue') },
      { path: 'recyclers', name: 'Recyclers', component: () => import('../views/Recyclers.vue') },
      { path: 'stats', name: 'Stats', component: () => import('../views/Stats.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token')
  if (!token && to.name !== 'Login') {
    return { name: 'Login' }
  }
})

export default router
