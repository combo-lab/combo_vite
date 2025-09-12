import { describe, expect, it } from 'vitest'
import combo from '../src'

describe('vite-plugin-combo', () => {
  it('handles missing configuration', () => {
    /* @ts-ignore */
    expect(() => combo()).toThrowError('vite-plugin-combo: missing configuration.')

    /* @ts-ignore */
    expect(() => combo({})).toThrowError(
      'vite-plugin-combo: missing configuration for "input".',
    )
  })

  it('accepts input as a string', () => {
    const plugin = combo({
      input: 'src/js/app.ts',
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.build.rollupOptions.input).toBe('src/js/app.ts')

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.rollupOptions.input).toBe('src/js/app.ts')
  })

  it('accepts input as an array', () => {
    const plugin = combo({
      input: ['src/js/app.ts', 'src/js/other.js'],
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.build.rollupOptions.input).toEqual(['src/js/app.ts', 'src/js/other.js'])

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.rollupOptions.input).toEqual(['src/js/app.ts', 'src/js/other.js'])
  })

  it('accepts input and ssrInput as strings', () => {
    const plugin = combo({
      input: 'src/js/app.ts',
      ssrInput: 'src/js/ssr.ts',
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.build.rollupOptions.input).toBe('src/js/app.ts')

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.rollupOptions.input).toBe('src/js/ssr.ts')
  })

  it('accepts input and ssrInput as arrays', () => {
    const plugin = combo({
      input: ['src/js/app.ts', 'src/js/other.js'],
      ssrInput: ['src/js/ssr.ts', 'src/js/other.js'],
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.build.rollupOptions.input).toEqual(['src/js/app.ts', 'src/js/other.js'])

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.rollupOptions.input).toEqual(['src/js/ssr.ts', 'src/js/other.js'])
  })

  it('accepts input and ssrInput as objects', () => {
    const plugin = combo({
      input: { app: 'src/js/entrypoint-csr.js' },
      ssrInput: { ssr: 'src/js/entrypoint-ssr.js' },
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.build.rollupOptions.input).toEqual({
      app: 'src/js/entrypoint-csr.js',
    })

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.rollupOptions.input).toEqual({
      ssr: 'src/js/entrypoint-ssr.js',
    })
  })

  it('accepts a full configuration', () => {
    const plugin = combo({
      input: 'src/js/app.ts',
      staticDir: 'other-static',
      buildDir: 'other-build',
      ssrInput: 'src/js/ssr.ts',
      ssrOutDir: 'other-ssr-output',
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.base).toBe('/other-build/')
    expect(config.build.manifest).toBe('manifest.json')
    expect(config.build.outDir).toBe('other-static/other-build')
    expect(config.build.rollupOptions.input).toBe('src/js/app.ts')

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.base).toBe('/other-build/')
    expect(ssrConfig.build.manifest).toBe(false)
    expect(ssrConfig.build.outDir).toBe('other-ssr-output')
    expect(ssrConfig.build.rollupOptions.input).toBe('src/js/ssr.ts')
  })

  it('has a default manifest path', () => {
    const plugin = combo({
      input: 'src/js/app.js',
    })

    const userConfig = {}
    const config = plugin.config(userConfig, { command: 'build', mode: 'production' })
    expect(config.build.manifest).toBe('manifest.json')
  })

  it('respects the users config option - build.manifest', () => {
    const plugin = combo({
      input: 'src/js/app.js',
    })

    const userConfig = { build: { manifest: 'my-custom-manifest.json' } }
    const config = plugin.config(userConfig, { command: 'build', mode: 'production' })
    expect(config.build.manifest).toBe('my-custom-manifest.json')
  })

  it('respects users config option - base', () => {
    const plugin = combo({
      input: 'src/js/app.ts',
    })

    const userConfig = { base: '/foo/' }
    const config = plugin.config(userConfig, { command: 'build', mode: 'production' })
    expect(config.base).toBe('/foo/')
  })

  it('accepts a partial configuration', () => {
    const plugin = combo({
      input: 'src/js/app.js',
      ssrInput: 'src/js/ssr.js',
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.base).toBe('/build/')
    expect(config.build.manifest).toBe('manifest.json')
    expect(config.build.outDir).toBe('../priv/static/build')
    expect(config.build.rollupOptions.input).toBe('src/js/app.js')

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.base).toBe('/build/')
    expect(ssrConfig.build.manifest).toBe(false)
    expect(ssrConfig.build.outDir).toBe('../priv/ssr')
    expect(ssrConfig.build.rollupOptions.input).toBe('src/js/ssr.js')
  })

  it('uses the input when ssrInput is not provided', () => {
    // This is support users who may want a dedicated Vite config for SSR.
    const plugin = combo({
      input: 'src/js/ssr.js',
    })

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.rollupOptions.input).toBe('src/js/ssr.js')
  })

  it('prefixes the base with ASSETS_BASE_URL in production mode', () => {
    process.env.ASSETS_BASE_URL = 'http://example.com'
    const plugin = combo({
      input: 'src/js/app.js',
    })

    const devConfig = plugin.config({}, { command: 'serve', mode: 'development' })
    expect(devConfig.base).toBe('')

    const prodConfig = plugin.config({}, { command: 'build', mode: 'production' })
    expect(prodConfig.base).toBe('http://example.com/build/')

    delete process.env.ASSETS_BASE_URL
  })

  it('prevents setting an empty staticDir', () => {
    expect(() => combo({ input: 'src/js/app.js', staticDir: '' })).toThrowError(
      'staticDir must be a directory',
    )
  })

  it('prevents setting an empty buildDir', () => {
    expect(() => combo({ input: 'src/js/app.js', buildDir: '' })).toThrowError(
      'buildDir must be a directory',
    )
  })

  it('handles surrounding slashes on directories', () => {
    const plugin = combo({
      input: 'src/js/app.js',
      staticDir: '/public/test/',
      buildDir: '/build/test/',
      ssrOutDir: '/ssr-output/test/',
    })

    const config = plugin.config(
      {},
      { command: 'build', mode: 'production' },
    )
    expect(config.base).toBe('/build/test/')
    expect(config.build.outDir).toBe('public/test/build/test')

    const ssrConfig = plugin.config(
      { build: { ssr: true } },
      { command: 'build', mode: 'production' },
    )
    expect(ssrConfig.build.outDir).toBe('ssr-output/test')
  })

  it('provides an @ alias by default', () => {
    const plugin = combo({
      input: 'src/js/app.js',
    })

    const config = plugin.config({}, { command: 'build', mode: 'development' })

    expect(config.resolve.alias['@']).toBe('/src')
  })

  it('respects a users existing @ alias', () => {
    const plugin = combo({
      input: 'src/js/app.js',
    })

    const config = plugin.config(
      {
        resolve: {
          alias: {
            '@': '/somewhere/else',
          },
        },
      },
      { command: 'build', mode: 'development' },
    )

    expect(config.resolve.alias['@']).toBe('/somewhere/else')
  })

  it('appends an Alias object when using an alias array', () => {
    const plugin = combo({
      input: 'src/js/app.js',
    })

    const config = plugin.config(
      {
        resolve: {
          alias: [{ find: '@', replacement: '/something/else' }],
        },
      },
      { command: 'build', mode: 'development' },
    )

    expect(config.resolve.alias).toEqual([
      { find: '@', replacement: '/something/else' },
      { find: '@', replacement: '/src' },
    ])
  })

  it('configures default cors.origin values', () => {
    const test = (pattern: RegExp | string, value: string) =>
      pattern instanceof RegExp ? pattern.test(value) : pattern === value

    const plugin = combo({
      input: 'src/js/app.js',
    })
    const resolvedConfig = plugin.config(
      { envDir: __dirname },
      {
        mode: '',
        command: 'serve',
      },
    )

    // Allowed origins...
    ;[
      // localhost
      'http://localhost',
      'https://localhost',
      'http://localhost:8080',
      'https://localhost:8080',
      // *.localhost
      'http://app.localhost',
      'https://app.localhost',
      'http://app.localhost:8080',
      'https://app.localhost:8080',
      // 127.0.0.1
      'http://127.0.0.1',
      'https://127.0.0.1',
      'http://127.0.0.1:8000',
      'https://127.0.0.1:8000',
      // *.test
      'http://combo.test',
      'https://combo.test',
      'http://combo.test:8000',
      'https://combo.test:8000',
      'http://my-app.test',
      'https://my-app.test',
      'http://my-app.test:8000',
      'https://my-app.test:8000',
      'https://my-app.test:8',
    ].every(url => expect(resolvedConfig.server.cors.origin.some(regex => test(regex, url))).toBe(true))

    // Disallowed origins...
    ;[
      'http://combo.com',
      'https://combo.com',
      'http://combo.com:8000',
      'https://combo.com:8000',
      'http://128.0.0.1',
      'https://128.0.0.1',
      'http://128.0.0.1:8000',
      'https://128.0.0.1:8000',
      'https://example.com',
      'http://example.com:8000',
      'https://example.com:8000',
      'http://exampletest',
      'http://example.test:',
    ].every(url => expect(resolvedConfig.server.cors.origin.some(regex => test(regex, url))).toBe(false))
  })

  it('respects the user\'s server.cors config', () => {
    const plugin = combo({
      input: 'src/js/app.js',
    })
    const resolvedConfig = plugin.config(
      {
        envDir: __dirname,
        server: {
          cors: true,
        },
      },
      {
        mode: '',
        command: 'serve',
      },
    )

    expect(resolvedConfig.server.cors).toBe(true)
  })
})
