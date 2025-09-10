import fs from "fs"
import { AddressInfo } from "net"
import { fileURLToPath } from "url"
import path from "path"
import {
    Plugin,
    loadEnv,
    UserConfig,
    ConfigEnv,
    ResolvedConfig,
    SSROptions,
    PluginOption,
    Rollup,
    defaultAllowedOrigins,
    createLogger,
} from "vite"
import fullReload, { Config as FullReloadConfig } from "vite-plugin-full-reload"

interface UserPluginConfig {
    /**
     * The path or paths of the entries.
     */
    input: Rollup.InputOption

    /**
     * Combo's public static directory.
     *
     * @default '../priv/static'
     */
    staticDir?: string

    /**
     * The public static directory's subdirectory where the CSR bundles should be written.
     *
     * It parent directory is the directory specified by staticDir.
     *
     * @default 'build'
     *
     */
    buildDir?: string

    /**
     * The path or paths of the SSR entries.
     */
    ssrInput?: Rollup.InputOption

    /**
     * The directory where the SSR bundles should be written.
     *
     * @default '../priv/ssr'
     */
    ssrOutDir?: string

    /**
     * The file name of the "hot" file.
     *
     * It parent directory is the directory specified by staticDir.
     *
     * @default '__hot__'
     */
    hotFile?: string

    /**
     * Configuration for reloading page on file (such as templates) changes.
     *
     * {@link https://github.com/ElMassimo/vite-plugin-full-reload}
     * @default false
     */
    refresh?: boolean | string | string[] | RefreshConfig | RefreshConfig[]

    /**
     * Transform the code while serving.
     */
    transformOnServe?: (code: string, url: DevServerUrl) => string
}

interface PluginConfig {
    input: Rollup.InputOption
    staticDir: string
    buildDir: string
    ssrInput: Rollup.InputOption
    ssrOutDir: string
    hotFile: string
    refresh: boolean | string | string[] | RefreshConfig | RefreshConfig[]
    transformOnServe: (code: string, url: DevServerUrl) => string
}

interface RefreshConfig {
    paths: string[]
    config?: FullReloadConfig
}

interface ComboPlugin extends Plugin {
    config: (config: UserConfig, env: ConfigEnv) => UserConfig
}

type DevServerUrl = `${"http" | "https"}://${string}:${number}`

let exitHandlersBound = false

const logger = createLogger("info", {
    prefix: "[vite-plugin-combo]",
})

/**
 * Vite plugin.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
export default function combo(config: UserPluginConfig): [ComboPlugin, ...Plugin[]] {
    const pluginConfig = resolveUserPluginConfig(config)

    return [
        resolveComboPlugin(pluginConfig),
        ...(resolveFullReloadConfig(pluginConfig) as Plugin[]),
    ]
}

/**
 * Convert the users configuration into a standard structure with defaults.
 */
function resolveUserPluginConfig(config: UserPluginConfig): Required<PluginConfig> {
    if (typeof config === "undefined") {
        throw new Error("vite-plugin-combo: missing configuration.")
    }

    if (typeof config.input === "undefined") {
        throw new Error('vite-plugin-combo: missing configuration for "input".')
    }

    if (typeof config.staticDir === "string") {
        config.staticDir = config.staticDir.trim().replace(/^\/+/, "").replace(/\/+$/, "")

        if (config.staticDir === "") {
            throw new Error(
                "vite-plugin-combo: staticDir must be a directory. E.g. '../priv/static'.",
            )
        }
    }

    if (typeof config.buildDir === "string") {
        config.buildDir = config.buildDir.trim().replace(/^\/+/, "").replace(/\/+$/, "")

        if (config.buildDir === "") {
            throw new Error("vite-plugin-combo: buildDir must be a directory. E.g. 'build'.")
        }
    }

    if (typeof config.ssrOutDir === "string") {
        config.ssrOutDir = config.ssrOutDir.trim().replace(/^\/+/, "").replace(/\/+$/, "")
    }

    const input = config.input
    const staticDir = config.staticDir ?? "../priv/static"
    const buildDir = config.buildDir ?? "build"
    const ssrInput = config.ssrInput ?? config.input
    const ssrOutDir = config.ssrOutDir ?? "../priv/ssr"
    const hotFile = path.join(staticDir, config.hotFile ?? "__hot__")
    const refresh = config.refresh ?? []
    const transformOnServe = config.transformOnServe ?? ((code) => code)

    return {
        input: input,
        staticDir: staticDir,
        buildDir: buildDir,
        ssrInput: ssrInput,
        ssrOutDir: ssrOutDir,
        hotFile: hotFile,
        refresh: refresh,
        transformOnServe: transformOnServe,
    }
}

/**
 * Resolve the Combo Plugin configuration.
 */
function resolveComboPlugin(pluginConfig: Required<PluginConfig>): ComboPlugin {
    let viteDevServerUrl: DevServerUrl
    let resolvedConfig: ResolvedConfig
    let userConfig: UserConfig

    const defaultAliases: Record<string, string> = {
        "@": "/src",
    }

    return {
        name: "combo",
        enforce: "post",
        config: (config, { command, mode }) => {
            userConfig = config
            const ssr = !!userConfig.build?.ssr
            const env = loadEnv(mode, userConfig.envDir || process.cwd(), "")

            return {
                base:
                    userConfig.base ??
                    (command === "build" ? resolveBaseFromEnv(pluginConfig, env) : ""),
                publicDir: userConfig.publicDir ?? false,
                build: {
                    manifest: userConfig.build?.manifest ?? (ssr ? false : "manifest.json"),
                    ssrManifest:
                        userConfig.build?.ssrManifest ?? (ssr ? "ssr-manifest.json" : false),
                    outDir: userConfig.build?.outDir ?? resolveOutDir(pluginConfig, ssr),
                    rollupOptions: {
                        input:
                            userConfig.build?.rollupOptions?.input ??
                            resolveInput(pluginConfig, ssr),
                    },
                    assetsInlineLimit: userConfig.build?.assetsInlineLimit ?? 0,
                },
                server: {
                    origin:
                        userConfig.server?.origin ??
                        "http://__vite_dev_server_host_placeholder__",
                    cors: userConfig.server?.cors ?? {
                        origin: userConfig.server?.origin ?? [
                            defaultAllowedOrigins,
                            /^https?:\/\/.*\.test(:\d+)?$/,        // for common conventions used for local development
                        ],
                    },
                },
                resolve: {
                    alias: Array.isArray(userConfig.resolve?.alias)
                        ? [
                              ...(userConfig.resolve?.alias ?? []),
                              ...Object.keys(defaultAliases).map((alias) => ({
                                  find: alias,
                                  replacement: defaultAliases[alias],
                              })),
                          ]
                        : {
                              ...defaultAliases,
                              ...userConfig.resolve?.alias,
                          },
                },
                ssr: {
                    noExternal: noExternalInertiaHelpers(userConfig),
                },
            }
        },
        configResolved(config) {
            resolvedConfig = config
        },
        transform(code) {
            if (resolvedConfig.command === "serve") {
                code = code.replace(
                    /http:\/\/__vite_dev_server_host_placeholder__/g,
                    viteDevServerUrl,
                )
                return pluginConfig.transformOnServe(code, viteDevServerUrl)
            }
        },
        configureServer(server) {
            server.httpServer?.once("listening", () => {
                const address = server.httpServer?.address()

                const isAddressInfo = (
                    x: string | AddressInfo | null | undefined,
                ): x is AddressInfo => typeof x === "object"
                if (isAddressInfo(address)) {
                    viteDevServerUrl = userConfig.server?.origin
                        ? (userConfig.server.origin as DevServerUrl)
                        : resolveDevServerUrl(address, server.config)

                    const hotFileParentDirectory = path.dirname(pluginConfig.hotFile)

                    if (!fs.existsSync(hotFileParentDirectory)) {
                        fs.mkdirSync(hotFileParentDirectory, { recursive: true })

                        setTimeout(() => {
                            logger.info(
                                `Hot file directory created ${fs.realpathSync(hotFileParentDirectory)}`,
                                { clear: true, timestamp: true },
                            )
                        }, 200)
                    }

                    fs.writeFileSync(
                        pluginConfig.hotFile,
                        `${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}`,
                    )
                }
            })

            if (!exitHandlersBound) {
                const clean = () => {
                    if (fs.existsSync(pluginConfig.hotFile)) {
                        fs.rmSync(pluginConfig.hotFile)
                    }
                }

                process.on("exit", clean)
                process.on("SIGINT", () => process.exit())
                process.on("SIGTERM", () => process.exit())
                process.on("SIGHUP", () => process.exit())

                process.stdin.on("close", () => process.exit(0))
                process.stdin.resume()

                exitHandlersBound = true
            }

            return () =>
                server.middlewares.use((req, res, next) => {
                    if (req.url === "/index.html") {
                        res.statusCode = 404

                        res.end(
                            fs
                                .readFileSync(path.join(dirname(), "dev-server-index.html"))
                                .toString(),
                        )
                    }

                    next()
                })
        },
    }
}

/**
 * Resolve the Vite base option from the environment.
 */
function resolveBaseFromEnv(config: Required<PluginConfig>, env: Record<string, string>): string {
    const assetUrl = env.ASSET_BASE_URL ?? ""
    const suffix = assetUrl.endsWith("/") ? "" : "/"
    return assetUrl + suffix + config.buildDir + "/"
}

/**
 * Resolve the Vite input path from the configuration.
 */
function resolveInput(
    config: Required<PluginConfig>,
    ssr: boolean,
): Rollup.InputOption | undefined {
    if (ssr) {
        return config.ssrInput
    } else {
        return config.input
    }
}

/**
 * Resolve the Vite outDir path from the configuration.
 */
function resolveOutDir(config: Required<PluginConfig>, ssr: boolean): string | undefined {
    if (ssr) {
        return config.ssrOutDir
    } else {
        return path.join(config.staticDir, config.buildDir)
    }
}

function resolveFullReloadConfig({ refresh: config }: Required<PluginConfig>): PluginOption[] {
    if (typeof config === "boolean") {
        return []
    }

    if (typeof config === "string") {
        config = [{ paths: [config] }]
    }

    if (!Array.isArray(config)) {
        config = [config]
    }

    if (config.some((c) => typeof c === "string")) {
        config = [{ paths: config }] as RefreshConfig[]
    }

    return (config as RefreshConfig[]).flatMap((c) => {
        const plugin = fullReload(c.paths, c.config)

        /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
        /** @ts-ignore */
        plugin.__combo_plugin_config = c

        return plugin
    })
}

/**
 * Resolve the development server URL from the server address and configuration.
 */
function resolveDevServerUrl(address: AddressInfo, config: ResolvedConfig): DevServerUrl {
    const configHmrProtocol =
        typeof config.server.hmr === "object" ? config.server.hmr.protocol : null
    const clientProtocol = configHmrProtocol
        ? configHmrProtocol === "wss"
            ? "https"
            : "http"
        : null
    const serverProtocol = config.server.https ? "https" : "http"
    const protocol = clientProtocol ?? serverProtocol

    const configHmrHost = typeof config.server.hmr === "object" ? config.server.hmr.host : null
    const configHost = typeof config.server.host === "string" ? config.server.host : null
    const serverAddress = isIpv6(address) ? `[${address.address}]` : address.address
    const host = configHmrHost ?? configHost ?? serverAddress

    const configHmrClientPort =
        typeof config.server.hmr === "object" ? config.server.hmr.clientPort : null
    const port = configHmrClientPort ?? address.port

    return `${protocol}://${host}:${port}`
}

function isIpv6(address: AddressInfo): boolean {
    return (
        address.family === "IPv6" ||
        // In node >=18.0 <18.4 this was an integer value. This was changed in a minor version.
        // See: https://github.com/laravel/vite-plugin/issues/103
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        address.family === 6
    )
}

/**
 * Add the Inertia helpers to the list of SSR dependencies that aren't externalized.
 *
 * @see https://vitejs.dev/guide/ssr.html#ssr-externals
 */
function noExternalInertiaHelpers(config: UserConfig): true | Array<string | RegExp> {
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    /* @ts-ignore */
    const userNoExternal = (config.ssr as SSROptions | undefined)?.noExternal
    const pluginNoExternal = ["vite-plugin-combo"]

    if (userNoExternal === true) {
        return true
    }

    if (typeof userNoExternal === "undefined") {
        return pluginNoExternal
    }

    return [
        ...(Array.isArray(userNoExternal) ? userNoExternal : [userNoExternal]),
        ...pluginNoExternal,
    ]
}

/**
 * The directory of the current file.
 */
function dirname(): string {
    return fileURLToPath(new URL(".", import.meta.url))
}
