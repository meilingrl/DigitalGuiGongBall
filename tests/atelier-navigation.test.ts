import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryHistory, createRouter } from 'vue-router'
import { replaceAtelierWorkId } from '../src/lib/atelierNavigation.js'

async function createAtelierRouter() {
  const component = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/atelier/:id?', component },
      { path: '/hub/works', component },
      { path: '/login', component },
    ],
  })
  await router.push('/atelier')
  return router
}

test('saved-work navigation arrives at its work address and accepts a repeated arrival', async () => {
  const router = await createAtelierRouter()
  await replaceAtelierWorkId(router, 'created-work')
  assert.equal(router.currentRoute.value.path, '/atelier/created-work')
  await replaceAtelierWorkId(router, 'created-work')
  assert.equal(router.currentRoute.value.path, '/atelier/created-work')
})

test('a guard that blocks the saved-work address is reported as a navigation error', async () => {
  const router = await createAtelierRouter()
  router.beforeEach(to => to.path === '/atelier/created-work' ? false : true)
  await assert.rejects(replaceAtelierWorkId(router, 'created-work'), /作品已保存.*未能切换/)
  assert.equal(router.currentRoute.value.path, '/atelier')
})

test('a newer navigation that cancels the saved-work transition cannot report arrival', async () => {
  const router = await createAtelierRouter()
  let enterGuard!: () => void
  let releaseGuard!: () => void
  const entered = new Promise<void>(resolve => { enterGuard = resolve })
  const gate = new Promise<void>(resolve => { releaseGuard = resolve })
  router.beforeEach(async to => {
    if (to.path === '/atelier/created-work') {
      enterGuard()
      await gate
    }
  })
  const savedNavigation = assert.rejects(replaceAtelierWorkId(router, 'created-work'), /作品已保存.*未能切换/)
  await entered
  await router.push('/hub/works')
  releaseGuard()
  await savedNavigation
  assert.equal(router.currentRoute.value.path, '/hub/works')
})

test('a guard redirecting away from the saved-work address cannot report arrival', async () => {
  const router = await createAtelierRouter()
  router.beforeEach(to => to.path === '/atelier/created-work' ? '/login' : true)
  await assert.rejects(replaceAtelierWorkId(router, 'created-work'), /作品已保存.*转向其他地址/)
  assert.equal(router.currentRoute.value.path, '/login')
})
