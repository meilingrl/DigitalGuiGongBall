import { isNavigationFailure, NavigationFailureType, type Router } from 'vue-router'

// Vue Router can resolve with a failure, or redirect successfully somewhere
// else. Only arriving at this saved work's address completes the transition.
export async function replaceAtelierWorkId(router: Router, id: string): Promise<void> {
  const destination = `/atelier/${encodeURIComponent(id)}`
  const failure = await router.replace(destination)
  if (isNavigationFailure(failure)) {
    if (isNavigationFailure(failure, NavigationFailureType.duplicated) && router.currentRoute.value.path === destination) return
    throw new Error('作品已保存，但未能切换到作品地址。可以重试导航或打开已保存作品。')
  }
  if (router.currentRoute.value.path !== destination) {
    throw new Error('作品已保存，但页面已转向其他地址。可以重试导航或打开已保存作品。')
  }
}
