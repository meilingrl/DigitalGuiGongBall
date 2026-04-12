import { createRouter, createWebHistory } from 'vue-router'
import HubLayout from '../layouts/HubLayout.vue'
import AtelierView from '../views/AtelierView.vue'
import DashboardView from '../views/hub/DashboardView.vue'
import WorkshopView from '../views/hub/WorkshopView.vue'
import MuseumView from '../views/hub/MuseumView.vue'
import SocialView from '../views/hub/SocialView.vue'
import StatsView from '../views/hub/StatsView.vue'
import SettingsView from '../views/hub/SettingsView.vue'
import ExploreView from '../views/hub/ExploreView.vue'
import MallView from '../views/hub/MallView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/hub/dashboard',
    },
    {
      path: '/hub',
      component: HubLayout,
      children: [
        {
          path: '',
          redirect: { name: 'hub-dashboard' },
        },
        {
          path: 'dashboard',
          name: 'hub-dashboard',
          component: DashboardView,
        },
        {
          path: 'workshop',
          name: 'hub-workshop',
          component: WorkshopView,
        },
        {
          path: 'museum',
          name: 'hub-museum',
          component: MuseumView,
        },
        {
          path: 'social',
          name: 'hub-social',
          component: SocialView,
        },
        {
          path: 'explore',
          name: 'hub-explore',
          component: ExploreView,
        },
        {
          path: 'mall',
          name: 'hub-mall',
          component: MallView,
        },
        {
          path: 'stats',
          name: 'hub-stats',
          component: StatsView,
        },
        {
          path: 'settings',
          name: 'hub-settings',
          component: SettingsView,
        },
      ],
    },
    {
      path: '/atelier',
      name: 'atelier',
      component: AtelierView,
    },
  ],
})

export default router
