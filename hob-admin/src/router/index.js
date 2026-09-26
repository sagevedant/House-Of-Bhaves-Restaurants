import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import StyleGuideView from '@/views/StyleGuideView.vue'
import LoginView from '@/views/LoginView.vue'
import ClientsView from '@/views/ClientsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/clients',
    name: 'clients',
    component: ClientsView,
  },
  {
    path: '/tenants',
    redirect: '/clients',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/styleguide',
    name: 'styleguide',
    component: StyleGuideView,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
