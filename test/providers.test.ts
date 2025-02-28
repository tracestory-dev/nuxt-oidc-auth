import { fileURLToPath } from 'node:url'
import { $fetch } from '@nuxt/test-utils'
import { url } from '@nuxt/test-utils/e2e'
import { expect, test } from '@nuxt/test-utils/playwright'
import { providers } from './fixtures/providers'

// TODO: Add test loop for each provider

test.use({
  // @ts-expect-error Config overwrite
  nuxt: {
    rootDir: fileURLToPath(new URL('./fixtures/oidcApp', import.meta.url)),
    build: false,
    buildDir: fileURLToPath(new URL('./fixtures/oidcApp/', import.meta.url)),
    nuxtConfig: {
      runtimeConfig: {
        oidc: {
          providers: {
            keycloak: {
              logoutUrl: '',
              clientId: process.env.NUXT_OIDC_PROVIDERS_KEYCLOAK_CLIENT_ID,
              clientSecret: process.env.NUXT_OIDC_PROVIDERS_KEYCLOAK_CLIENT_SECRET,
            },
          },
        },
      },
    },
  },
})

test('redirects correctly', async () => {
  const rootUrl = url('/')
  const response = await fetch(rootUrl)
  expect(response.url).toMatch(url('/auth/login'))
})

test('excluded page is rendered', async () => {
  const excludedUrl = url('/excluded')
  const response = await fetch(excludedUrl)
  expect(response.url).toMatch(url('/excluded'))
  const html = await $fetch(excludedUrl)
  expect(html).toContain('Excluded page')
})

test('redirects to provider', async ({ page, goto }) => {
  const provider = 'keycloak'
  const providerUrl = url(`/auth/login`)
  await goto(providerUrl)
  await page.click(`button[name="${provider}"]`)
  await page.fill('input[name="username"]', 'testuser')
  await page.fill('input[name="password"]', 'p@ssword')
  await page.click('input[name="login"]')
  await page.waitForURL(url('/'))
  const currentProviderDiv = page.locator('div[name="currentProvider"]')
  expect(await currentProviderDiv.textContent()).toBe(provider)
})

test('can refresh', async ({ page, goto }) => {
  const provider = 'keycloak'
  const providerUrl = url(`/auth/login`)
  await goto(providerUrl)
  await page.click(`button[name="${provider}"]`)
  await page.fill('input[name="username"]', 'testuser')
  await page.fill('input[name="password"]', 'p@ssword')
  await page.click('input[name="login"]')
  await page.waitForURL(url('/'))
  const updatedAt = Number(await page.locator('div[name="updatedAt"]').textContent())
  await page.waitForTimeout(1000)
  await page.click('button[name="refresh"]')
  await page.waitForTimeout(100)
  const updatedAt2 = Number(await page.locator('div[name="updatedAt"]').textContent())
  expect(updatedAt2).toBeGreaterThan(updatedAt)
})

test('can logout', async ({ page, goto }) => {
  const provider = 'keycloak'
  const providerUrl = url(`/auth/login`)
  await goto(providerUrl)
  await page.click(`button[name="${provider}"]`)
  await page.fill('input[name="username"]', 'testuser')
  await page.fill('input[name="password"]', 'p@ssword')
  await page.click('input[name="login"]')
  await page.click('button[name="logout"]')
  expect(page.url()).toMatch(/^http:\/\/localhost:8080/)
})
