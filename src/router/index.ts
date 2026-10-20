import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { safeReturnPath } from '../lib/journey'
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, saved) { if (saved) return saved; if (to.path !== from.path) return { top: 0 }; if (to.hash) return { el: to.hash, top: 90 } },
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/', redirect: '/hub/home' },
    { path: '/hub', component: () => import('../layouts/HubLayout.vue'), children: [
      { path: '', redirect: '/hub/home' },
      { path: 'home', name: 'hub-home', component: () => import('../views/hub/HomeView.vue') },
      { path: 'workshop', name: 'hub-workshop', component: () => import('../views/hub/WorkshopView.vue') },
      { path: 'works', name: 'hub-works', component: () => import('../views/hub/WorksView.vue'), meta: { requiresAuth: true } },
      { path: 'works/:id', name: 'hub-work-detail', component: () => import('../views/hub/WorkDetailView.vue'), meta: { requiresAuth: true } },
      { path: 'legacy-workshop', name: 'hub-legacy-workshop', component: () => import('../views/hub/LegacyWorkshopView.vue') },
      { path: 'dashboard', redirect: '/hub/home' },
      { path: 'legacy-dashboard', name: 'hub-legacy-dashboard', component: () => import('../views/hub/DashboardView.vue'), meta: { requiresAuth: true } },
      { path: 'museum', name: 'hub-museum', component: () => import('../views/hub/MuseumView.vue') },
      { path: 'studies/:id', name: 'hub-study', component: () => import('../views/hub/StudyView.vue') },
      { path: 'legacy-museum', name: 'hub-legacy-museum', component: () => import('../views/hub/LegacyMuseumView.vue') },
      { path: 'social', name: 'hub-social', component: () => import('../views/hub/SocialView.vue') },
      { path: 'explore', name: 'hub-explore', component: () => import('../views/hub/ExploreView.vue') },
      { path: 'mall', name: 'hub-mall', component: () => import('../views/hub/MallView.vue') },
      { path: 'stats', name: 'hub-stats', component: () => import('../views/hub/StatsView.vue') },
      { path: 'settings', name: 'hub-settings', component: () => import('../views/hub/SettingsView.vue') },
    ] },
    { path: '/atelier/:id?', name: 'atelier', component: () => import('../views/AtelierView.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/hub/home' },
  ],
})
router.beforeEach(async to => {
  const auth = useAuthStore()
  await auth.restore()
  if (to.meta.requiresAuth && !auth.user) return { name: 'login', query: { redirect: safeReturnPath(to.fullPath) } }
  return true
})
export default router
