import { describe, expect, it } from "vitest"
import fs from "fs"
import combo from "../src"
import { resolvePageComponent } from "../src/inertia-helpers"
import path from "path"

describe("vite-plugin-combo", () => {
    it("handles missing configuration", () => {
        /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
        /* @ts-ignore */
        expect(() => combo()).toThrowError("vite-plugin-combo: missing configuration.")

        /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
        /* @ts-ignore */
        expect(() => combo({})).toThrowError(
            'vite-plugin-combo: missing configuration for "input".',
        )
    })

    it("accepts a single input", () => {
        const plugin = combo({ input: "src/js/app.ts" })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.build.rollupOptions.input).toBe("src/js/app.ts")

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.rollupOptions.input).toBe("src/js/app.ts")
    })

    it("accepts an array of inputs", () => {
        const plugin = combo({ input: ["src/js/app.ts", "src/js/other.js"] })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.build.rollupOptions.input).toEqual(["src/js/app.ts", "src/js/other.js"])

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.rollupOptions.input).toEqual(["src/js/app.ts", "src/js/other.js"])
    })

    it("accepts a full configuration", () => {
        const plugin = combo({
            input: "src/js/app.ts",
            staticDir: "other-static",
            buildDir: "other-build",
            ssrInput: "src/js/ssr.ts",
            ssrOutDir: "other-ssr-output",
        })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.base).toBe("/other-build/")
        expect(config.build.manifest).toBe("manifest.json")
        expect(config.build.outDir).toBe("other-static/other-build")
        expect(config.build.rollupOptions.input).toBe("src/js/app.ts")

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.base).toBe("/other-build/")
        expect(ssrConfig.build.manifest).toBe(false)
        expect(ssrConfig.build.outDir).toBe("other-ssr-output")
        expect(ssrConfig.build.rollupOptions.input).toBe("src/js/ssr.ts")
    })

    it("accepts a single input within a full configuration", () => {
        const plugin = combo({
            input: "src/js/app.ts",
            ssrInput: "src/js/ssr.ts",
        })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.build.rollupOptions.input).toBe("src/js/app.ts")

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.rollupOptions.input).toBe("src/js/ssr.ts")
    })

    it("accepts an array of inputs within a full configuration", () => {
        const plugin = combo({
            input: ["src/js/app.ts", "src/js/other.js"],
            ssrInput: ["src/js/ssr.ts", "src/js/other.js"],
        })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.build.rollupOptions.input).toEqual(["src/js/app.ts", "src/js/other.js"])

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.rollupOptions.input).toEqual(["src/js/ssr.ts", "src/js/other.js"])
    })

    it("accepts an input object within a full configuration", () => {
        const plugin = combo({
            input: { app: "src/js/entrypoint-csr.js" },
            ssrInput: { ssr: "src/js/entrypoint-ssr.js" },
        })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.build.rollupOptions.input).toEqual({
            app: "src/js/entrypoint-csr.js",
        })

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.rollupOptions.input).toEqual({
            ssr: "src/js/entrypoint-ssr.js",
        })
    })

    it("has a default manifest path", () => {
        const plugin = combo({
            input: "src/js/app.js",
        })[0]

        const userConfig = {}

        const config = plugin.config(userConfig, { command: "build", mode: "production" })

        expect(config.build.manifest).toBe("manifest.json")
    })

    it("respects the users build.manifest config option", () => {
        const plugin = combo({
            input: "src/js/app.js",
        })[0]

        const userConfig = { build: { manifest: "my-custom-manifest.json" } }

        const config = plugin.config(userConfig, { command: "build", mode: "production" })

        expect(config.build.manifest).toBe("my-custom-manifest.json")
    })

    it("respects users base config option", () => {
        const plugin = combo({
            input: "src/js/app.ts",
        })[0]

        const userConfig = { base: "/foo/" }

        const config = plugin.config(userConfig, { command: "build", mode: "production" })

        expect(config.base).toBe("/foo/")
    })

    it("accepts a partial configuration", () => {
        const plugin = combo({
            input: "src/js/app.js",
            ssrInput: "src/js/ssr.js",
        })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.base).toBe("/build/")
        expect(config.build.manifest).toBe("manifest.json")
        expect(config.build.outDir).toBe("../priv/static/build")
        expect(config.build.rollupOptions.input).toBe("src/js/app.js")

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.base).toBe("/build/")
        expect(ssrConfig.build.manifest).toBe(false)
        expect(ssrConfig.build.outDir).toBe("../priv/ssr")
        expect(ssrConfig.build.rollupOptions.input).toBe("src/js/ssr.js")
    })

    it("uses the default entry point when ssr entry point is not provided", () => {
        // This is support users who may want a dedicated Vite config for SSR.
        const plugin = combo({ input: "src/js/ssr.js" })[0]

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.rollupOptions.input).toBe("src/js/ssr.js")
    })

    it("prefixes the base with ASSET_URL in production mode", () => {
        process.env.ASSET_URL = "http://example.com"
        const plugin = combo({ input: "src/js/app.js" })[0]

        const devConfig = plugin.config({}, { command: "serve", mode: "development" })
        expect(devConfig.base).toBe("")

        const prodConfig = plugin.config({}, { command: "build", mode: "production" })
        expect(prodConfig.base).toBe("http://example.com/build/")

        delete process.env.ASSET_URL
    })

    it("prevents setting an empty staticDir", () => {
        expect(() => combo({ input: "src/js/app.js", staticDir: "" })[0]).toThrowError(
            "staticDir must be a directory",
        )
    })

    it("prevents setting an empty buildDir", () => {
        expect(() => combo({ input: "src/js/app.js", buildDir: "" })[0]).toThrowError(
            "buildDir must be a directory",
        )
    })

    it("handles surrounding slashes on directories", () => {
        const plugin = combo({
            input: "src/js/app.js",
            staticDir: "/public/test/",
            buildDir: "/build/test/",
            ssrOutDir: "/ssr-output/test/",
        })[0]

        const config = plugin.config({}, { command: "build", mode: "production" })
        expect(config.base).toBe("/build/test/")
        expect(config.build.outDir).toBe("public/test/build/test")

        const ssrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        expect(ssrConfig.build.outDir).toBe("ssr-output/test")
    })

    it("provides an @ alias by default", () => {
        const plugin = combo({ input: "src/js/app.js" })[0]

        const config = plugin.config({}, { command: "build", mode: "development" })

        expect(config.resolve.alias["@"]).toBe("/src")
    })

    it("respects a users existing @ alias", () => {
        const plugin = combo({ input: "src/js/app.js" })[0]

        const config = plugin.config(
            {
                resolve: {
                    alias: {
                        "@": "/somewhere/else",
                    },
                },
            },
            { command: "build", mode: "development" },
        )

        expect(config.resolve.alias["@"]).toBe("/somewhere/else")
    })

    it("appends an Alias object when using an alias array", () => {
        const plugin = combo({ input: "src/js/app.js" })[0]

        const config = plugin.config(
            {
                resolve: {
                    alias: [{ find: "@", replacement: "/something/else" }],
                },
            },
            { command: "build", mode: "development" },
        )

        expect(config.resolve.alias).toEqual([
            { find: "@", replacement: "/something/else" },
            { find: "@", replacement: "/src" },
        ])
    })

    it("prevents the Inertia helpers from being externalized", () => {
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        const plugin = combo({ input: "src/js/app.js" })[0]

        const noSsrConfig = plugin.config(
            { build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        /* @ts-ignore */
        expect(noSsrConfig.ssr.noExternal).toEqual(["vite-plugin-combo"])

        /* @ts-ignore */
        const nothingExternalConfig = plugin.config(
            { ssr: { noExternal: true }, build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        /* @ts-ignore */
        expect(nothingExternalConfig.ssr.noExternal).toBe(true)

        /* @ts-ignore */
        const arrayNoExternalConfig = plugin.config(
            { ssr: { noExternal: ["foo"] }, build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        /* @ts-ignore */
        expect(arrayNoExternalConfig.ssr.noExternal).toEqual(["foo", "vite-plugin-combo"])

        /* @ts-ignore */
        const stringNoExternalConfig = plugin.config(
            { ssr: { noExternal: "foo" }, build: { ssr: true } },
            { command: "build", mode: "production" },
        )
        /* @ts-ignore */
        expect(stringNoExternalConfig.ssr.noExternal).toEqual(["foo", "vite-plugin-combo"])
    })

    it("does not configure full reload when configuration it not an object", () => {
        const plugins = combo({ input: "src/js/app.js" })

        expect(plugins.length).toBe(1)
    })

    it("does not configure full reload when refresh is not present", () => {
        const plugins = combo({
            input: "src/js/app.js",
        })

        expect(plugins.length).toBe(1)
    })

    it("does not configure full reload when refresh is set to undefined", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: undefined,
        })
        expect(plugins.length).toBe(1)
    })

    it("does not configure full reload when refresh is false", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: false,
        })

        expect(plugins.length).toBe(1)
    })

    it("configures full reload with routes and views when refresh is true", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: [
                "../lib/demo/web/router.ex",
                "../lib/demo/web/(controllers|layouts|components)/**/*.(ex|ceex)",
            ],
        })

        console.log(plugins)

        expect(plugins.length).toBe(2)
        /** @ts-ignore */
        expect(plugins[1].__combo_plugin_config).toEqual({
            paths: [
                "../lib/demo/web/router.ex",
                "../lib/demo/web/(controllers|layouts|components)/**/*.(ex|ceex)",
            ],
        })
    })

    it("configures full reload when refresh is a single path", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: "path/to/watch/**",
        })

        expect(plugins.length).toBe(2)
        /** @ts-ignore */
        expect(plugins[1].__combo_plugin_config).toEqual({
            paths: ["path/to/watch/**"],
        })
    })

    it("configures full reload when refresh is an array of paths", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: ["path/to/watch/**", "another/to/watch/**"],
        })

        expect(plugins.length).toBe(2)
        /** @ts-ignore */
        expect(plugins[1].__combo_plugin_config).toEqual({
            paths: ["path/to/watch/**", "another/to/watch/**"],
        })
    })

    it("configures full reload when refresh is a complete configuration to proxy", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: {
                paths: ["path/to/watch/**", "another/to/watch/**"],
                config: { delay: 987 },
            },
        })

        expect(plugins.length).toBe(2)
        /** @ts-ignore */
        expect(plugins[1].__combo_plugin_config).toEqual({
            paths: ["path/to/watch/**", "another/to/watch/**"],
            config: { delay: 987 },
        })
    })

    it("configures full reload when refresh is an array of complete configurations to proxy", () => {
        const plugins = combo({
            input: "src/js/app.js",
            refresh: [
                {
                    paths: ["path/to/watch/**"],
                    config: { delay: 987 },
                },
                {
                    paths: ["another/to/watch/**"],
                    config: { delay: 123 },
                },
            ],
        })

        expect(plugins.length).toBe(3)
        /** @ts-ignore */
        expect(plugins[1].__combo_plugin_config).toEqual({
            paths: ["path/to/watch/**"],
            config: { delay: 987 },
        })
        /** @ts-ignore */
        expect(plugins[2].__combo_plugin_config).toEqual({
            paths: ["another/to/watch/**"],
            config: { delay: 123 },
        })
    })

    it("configures default cors.origin values", () => {
        const test = (pattern: RegExp | string, value: string) =>
            pattern instanceof RegExp ? pattern.test(value) : pattern === value
        fs.writeFileSync(path.join(__dirname, ".env"), "APP_URL=http://example.com")

        const plugins = combo({
            input: "src/js/app.js",
        })
        const resolvedConfig = plugins[0].config(
            { envDir: __dirname },
            {
                mode: "",
                command: "serve",
            },
        )

        // Allowed origins...
        expect(
            [
                // localhost
                "http://localhost",
                "https://localhost",
                "http://localhost:8080",
                "https://localhost:8080",
                // 127.0.0.1
                "http://127.0.0.1",
                "https://127.0.0.1",
                "http://127.0.0.1:8000",
                "https://127.0.0.1:8000",
                // *.test
                "http://combo.test",
                "https://combo.test",
                "http://combo.test:8000",
                "https://combo.test:8000",
                "http://my-app.test",
                "https://my-app.test",
                "http://my-app.test:8000",
                "https://my-app.test:8000",
                "https://my-app.test:8",
                // APP_URL
                "http://example.com",
                "https://subdomain.my-app.test",
            ].some((url) => resolvedConfig.server.cors.origin.some((regex) => test(regex, url))),
        ).toBe(true)
        // Disallowed origins...
        expect(
            [
                "http://combo.com",
                "https://combo.com",
                "http://combo.com:8000",
                "https://combo.com:8000",
                "http://128.0.0.1",
                "https://128.0.0.1",
                "http://128.0.0.1:8000",
                "https://128.0.0.1:8000",
                "https://example.com",
                "http://example.com:8000",
                "https://example.com:8000",
                "http://exampletest",
                "http://example.test:",
            ].some((url) => resolvedConfig.server.cors.origin.some((regex) => test(regex, url))),
        ).toBe(false)

        fs.rmSync(path.join(__dirname, ".env"))
    })

    it("respects the user's server.cors config", () => {
        const plugins = combo({
            input: "src/js/app.js",
        })
        const resolvedConfig = plugins[0].config(
            {
                envDir: __dirname,
                server: {
                    cors: true,
                },
            },
            {
                mode: "",
                command: "serve",
            },
        )

        expect(resolvedConfig.server.cors).toBe(true)
    })
})

describe("inertia-helpers", () => {
    const path = "./__data__/dummy.ts"
    it("pass glob value to resolvePageComponent", async () => {
        const file = await resolvePageComponent<{ default: string }>(
            path,
            import.meta.glob("./__data__/*.ts"),
        )
        expect(file.default).toBe("Dummy File")
    })

    it("pass eagerly globed value to resolvePageComponent", async () => {
        const file = await resolvePageComponent<{ default: string }>(
            path,
            import.meta.glob("./__data__/*.ts", { eager: true }),
        )
        expect(file.default).toBe("Dummy File")
    })

    it("accepts array of paths", async () => {
        const file = await resolvePageComponent<{ default: string }>(
            ["missing-page", path],
            import.meta.glob("./__data__/*.ts", { eager: true }),
            path,
        )
        expect(file.default).toBe("Dummy File")
    })

    it("throws an error when a page is not found", async () => {
        const callback = () =>
            resolvePageComponent<{ default: string }>(
                "missing-page",
                import.meta.glob("./__data__/*.ts"),
            )
        await expect(callback).rejects.toThrowError(new Error("Page not found: missing-page"))
    })

    it("throws an error when a page is not found", async () => {
        const callback = () =>
            resolvePageComponent<{ default: string }>(
                ["missing-page-1", "missing-page-2"],
                import.meta.glob("./__data__/*.ts"),
            )
        await expect(callback).rejects.toThrowError(
            new Error("Page not found: missing-page-1,missing-page-2"),
        )
    })
})
