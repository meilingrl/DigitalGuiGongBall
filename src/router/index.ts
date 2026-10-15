import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, saved) { if (saved) return saved; if (to.path !== from.path) return { top: 0 }; if (to.hash) return { el: to.hash, top: 90 } },
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/', redirect: '/hub/workshop' },
    { path: '/hub', component: () => import('../layouts/HubLayout.vue'), meta: { requiresAuth: true }, children: [
      { path: '', redirect: '/hub/workshop' },
      { path: 'workshop', name: 'hub-workshop', component: () => import('../views/hub/WorkshopView.vue') },
      { path: 'works', name: 'hub-works', component: () => import('../views/hub/WorksView.vue') },
      { path: 'legacy-workshop', name: 'hub-legacy-workshop', component: () => import('../views/hub/LegacyWorkshopView.vue') },
      { path: 'dashboard', name: 'hub-dashboard', component: () => import('../views/hub/DashboardView.vue') },
      { path: 'museum', name: 'hub-museum', component: () => import('../views/hub/MuseumView.vue') },
      { path: 'social', name: 'hub-social', component: () => import('../views/hub/SocialView.vue') },
      { path: 'explore', name: 'hub-explore', component: () => import('../views/hub/ExploreView.vue') },
      { path: 'mall', name: 'hub-mall', component: () => import('../views/hub/MallView.vue') },
      { path: 'stats', name: 'hub-stats', component: () => import('../views/hub/StatsView.vue') },
      { path: 'settings', name: 'hub-settings', component: () => import('../views/hub/SettingsView.vue') },
    ] },
    { path: '/atelier/:id?', name: 'atelier', component: () => import('../views/AtelierView.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/hub/workshop' },
  ],
})
router.beforeEach(async to => {
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  await auth.restore()
  if (!auth.user) return { name: 'login' }
  return true
})
export default router
