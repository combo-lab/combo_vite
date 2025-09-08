import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import {
  loadEnv,
  defaultAllowedOrigins,
  createLogger
} from "vite";
import fullReload from "vite-plugin-full-reload";
let exitHandlersBound = false;
const refreshPaths = [
  "app/Livewire/**",
  "app/View/Components/**",
  "lang/**",
  "resources/lang/**",
  "resources/views/**",
  "routes/**"
].filter((path2) => fs.existsSync(path2.replace(/\*\*$/, "")));
const logger = createLogger("info", {
  prefix: "[vite-plugin-combo]"
});
function combo(config) {
  const pluginConfig = resolvePluginConfig(config);
  return [
    resolveComboPlugin(pluginConfig),
    ...resolveFullReloadConfig(pluginConfig)
  ];
}
function resolvePluginConfig(config) {
  if (typeof config === "undefined") {
    throw new Error("vite-plugin-combo: missing configuration.");
  }
  if (typeof config === "string" || Array.isArray(config)) {
    config = { input: config, ssrInput: config };
  }
  if (typeof config.input === "undefined") {
    throw new Error('vite-plugin-combo: missing configuration for "input".');
  }
  if (typeof config.staticDir === "string") {
    config.staticDir = config.staticDir.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    if (config.staticDir === "") {
      throw new Error(
        "vite-plugin-combo: staticDir must be a directory. E.g. '../priv/static'."
      );
    }
  }
  if (typeof config.buildDir === "string") {
    config.buildDir = config.buildDir.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    if (config.buildDir === "") {
      throw new Error("vite-plugin-combo: buildDir must be a directory. E.g. 'build'.");
    }
  }
  if (typeof config.ssrOutDir === "string") {
    config.ssrOutDir = config.ssrOutDir.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  }
  if (config.refresh === true) {
    config.refresh = [{ paths: refreshPaths }];
  }
  const staticDir = config.staticDir ?? "../priv/static";
  const ssrOutDir = config.ssrOutDir ?? "../priv/ssr";
  return {
    input: config.input,
    staticDir,
    buildDir: config.buildDir ?? "build",
    ssrInput: config.ssrInput ?? config.input,
    ssrOutDir,
    hotFile: config.hotFile ?? path.join(staticDir, "__hot__"),
    refresh: config.refresh ?? false,
    transformOnServe: config.transformOnServe ?? ((code) => code)
  };
}
function resolveComboPlugin(pluginConfig) {
  let viteDevServerUrl;
  let resolvedConfig;
  let userConfig;
  const defaultAliases = {
    "@": "/src"
  };
  return {
    name: "combo",
    enforce: "post",
    config: (config, { command, mode }) => {
      userConfig = config;
      const ssr = !!userConfig.build?.ssr;
      const env = loadEnv(mode, userConfig.envDir || process.cwd(), "");
      const serverConfig = command === "serve" ? resolveServerConfigFromEnv(env) : void 0;
      return {
        base: userConfig.base ?? (command === "build" ? resolveBaseFromEnv(pluginConfig, env) : ""),
        publicDir: userConfig.publicDir ?? false,
        build: {
          manifest: userConfig.build?.manifest ?? (ssr ? false : "manifest.json"),
          ssrManifest: userConfig.build?.ssrManifest ?? (ssr ? "ssr-manifest.json" : false),
          outDir: userConfig.build?.outDir ?? resolveOutDir(pluginConfig, ssr),
          rollupOptions: {
            input: userConfig.build?.rollupOptions?.input ?? resolveInput(pluginConfig, ssr)
          },
          assetsInlineLimit: userConfig.build?.assetsInlineLimit ?? 0
        },
        server: {
          origin: userConfig.server?.origin ?? "http://__vite_dev_server_host_placeholder__",
          cors: userConfig.server?.cors ?? {
            origin: userConfig.server?.origin ?? [
              defaultAllowedOrigins,
              ...env.APP_URL ? [env.APP_URL] : []
            ]
          },
          ...serverConfig ? {
            host: userConfig.server?.host ?? serverConfig.host,
            hmr: userConfig.server?.hmr === false ? false : {
              ...serverConfig.hmr,
              ...userConfig.server?.hmr === true ? {} : userConfig.server?.hmr
            },
            https: userConfig.server?.https ?? serverConfig.https
          } : void 0
        },
        resolve: {
          alias: Array.isArray(userConfig.resolve?.alias) ? [
            ...userConfig.resolve?.alias ?? [],
            ...Object.keys(defaultAliases).map((alias) => ({
              find: alias,
              replacement: defaultAliases[alias]
            }))
          ] : {
            ...defaultAliases,
            ...userConfig.resolve?.alias
          }
        },
        ssr: {
          noExternal: noExternalInertiaHelpers(userConfig)
        }
      };
    },
    configResolved(config) {
      resolvedConfig = config;
    },
    transform(code) {
      if (resolvedConfig.command === "serve") {
        code = code.replace(
          /http:\/\/__vite_dev_server_host_placeholder__/g,
          viteDevServerUrl
        );
        return pluginConfig.transformOnServe(code, viteDevServerUrl);
      }
    },
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        const isAddressInfo = (x) => typeof x === "object";
        if (isAddressInfo(address)) {
          viteDevServerUrl = userConfig.server?.origin ? userConfig.server.origin : resolveDevServerUrl(address, server.config);
          const hotFileParentDirectory = path.dirname(pluginConfig.hotFile);
          if (!fs.existsSync(hotFileParentDirectory)) {
            fs.mkdirSync(hotFileParentDirectory, { recursive: true });
            setTimeout(() => {
              logger.info(`Hot file directory created ${fs.realpathSync(hotFileParentDirectory)}`, { clear: true, timestamp: true });
            }, 200);
          }
          fs.writeFileSync(
            pluginConfig.hotFile,
            `${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}`
          );
        }
      });
      if (!exitHandlersBound) {
        const clean = () => {
          if (fs.existsSync(pluginConfig.hotFile)) {
            fs.rmSync(pluginConfig.hotFile);
          }
        };
        process.on("exit", clean);
        process.on("SIGINT", () => process.exit());
        process.on("SIGTERM", () => process.exit());
        process.on("SIGHUP", () => process.exit());
        process.stdin.on("close", () => process.exit(0));
        process.stdin.resume();
        exitHandlersBound = true;
      }
      return () => server.middlewares.use((req, res, next) => {
        if (req.url === "/index.html") {
          res.statusCode = 404;
          res.end(
            fs.readFileSync(path.join(dirname(), "dev-server-index.html")).toString()
          );
        }
        next();
      });
    }
  };
}
function resolveBaseFromEnv(config, env) {
  const assetUrl = env.ASSET_URL ?? "";
  const suffix = assetUrl.endsWith("/") ? "" : "/";
  return assetUrl + suffix + config.buildDir + "/";
}
function resolveInput(config, ssr) {
  if (ssr) {
    return config.ssrInput;
  } else {
    return config.input;
  }
}
function resolveOutDir(config, ssr) {
  if (ssr) {
    return config.ssrOutDir;
  } else {
    return path.join(config.staticDir, config.buildDir);
  }
}
function resolveFullReloadConfig({ refresh: config }) {
  if (typeof config === "boolean") {
    return [];
  }
  if (typeof config === "string") {
    config = [{ paths: [config] }];
  }
  if (!Array.isArray(config)) {
    config = [config];
  }
  if (config.some((c) => typeof c === "string")) {
    config = [{ paths: config }];
  }
  return config.flatMap((c) => {
    const plugin = fullReload(c.paths, c.config);
    plugin.__combo_plugin_config = c;
    return plugin;
  });
}
function resolveDevServerUrl(address, config) {
  const configHmrProtocol = typeof config.server.hmr === "object" ? config.server.hmr.protocol : null;
  const clientProtocol = configHmrProtocol ? configHmrProtocol === "wss" ? "https" : "http" : null;
  const serverProtocol = config.server.https ? "https" : "http";
  const protocol = clientProtocol ?? serverProtocol;
  const configHmrHost = typeof config.server.hmr === "object" ? config.server.hmr.host : null;
  const configHost = typeof config.server.host === "string" ? config.server.host : null;
  const serverAddress = isIpv6(address) ? `[${address.address}]` : address.address;
  const host = configHmrHost ?? configHost ?? serverAddress;
  const configHmrClientPort = typeof config.server.hmr === "object" ? config.server.hmr.clientPort : null;
  const port = configHmrClientPort ?? address.port;
  return `${protocol}://${host}:${port}`;
}
function isIpv6(address) {
  return address.family === "IPv6" || // In node >=18.0 <18.4 this was an integer value. This was changed in a minor version.
  // See: https://github.com/laravel/vite-plugin/issues/103
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore-next-line
  address.family === 6;
}
function noExternalInertiaHelpers(config) {
  const userNoExternal = config.ssr?.noExternal;
  const pluginNoExternal = ["vite-plugin-combo"];
  if (userNoExternal === true) {
    return true;
  }
  if (typeof userNoExternal === "undefined") {
    return pluginNoExternal;
  }
  return [
    ...Array.isArray(userNoExternal) ? userNoExternal : [userNoExternal],
    ...pluginNoExternal
  ];
}
function resolveServerConfigFromEnv(env) {
  if (!env.VITE_DEV_SERVER_KEY && !env.VITE_DEV_SERVER_CERT) {
    return;
  }
  if (!fs.existsSync(env.VITE_DEV_SERVER_KEY) || !fs.existsSync(env.VITE_DEV_SERVER_CERT)) {
    throw Error(
      `Unable to find the certificate files specified in your environment. Ensure you have correctly configured VITE_DEV_SERVER_KEY: [${env.VITE_DEV_SERVER_KEY}] and VITE_DEV_SERVER_CERT: [${env.VITE_DEV_SERVER_CERT}].`
    );
  }
  const host = resolveHostFromEnv(env);
  if (!host) {
    throw Error(
      `Unable to determine the host from the environment's APP_URL: [${env.APP_URL}].`
    );
  }
  return {
    hmr: { host },
    host,
    https: {
      key: fs.readFileSync(env.VITE_DEV_SERVER_KEY),
      cert: fs.readFileSync(env.VITE_DEV_SERVER_CERT)
    }
  };
}
function resolveHostFromEnv(env) {
  try {
    return new URL(env.APP_URL).host;
  } catch {
    return;
  }
}
function dirname() {
  return fileURLToPath(new URL(".", import.meta.url));
}
export {
  combo as default,
  refreshPaths
};
