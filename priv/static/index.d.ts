import { Plugin, UserConfig, ConfigEnv, Rollup } from "vite";
import { Config as FullReloadConfig } from "vite-plugin-full-reload";
interface PluginConfig {
    /**
     * The path or paths of the entries.
     */
    input: Rollup.InputOption;
    /**
     * Combo's public static directory.
     *
     * @default '../priv/static'
     */
    staticDir?: string;
    /**
     * The public static directory's subdirectory where the CSR bundles should be written.
     *
     * @default 'build'
     *
     */
    buildDir?: string;
    /**
     * The path or paths of the SSR entries.
     */
    ssrInput?: Rollup.InputOption;
    /**
     * The directory where the SSR bundles should be written.
     *
     * @default '../priv/ssr'
     */
    ssrOutDir?: string;
    /**
     * The path to the "hot" file.
     *
     * @default `${staticDir}/__hot__`
     */
    hotFile?: string;
    /**
     * Configuration for performing full page refresh on blade (or other) file changes.
     *
     * {@link https://github.com/ElMassimo/vite-plugin-full-reload}
     * @default false
     */
    refresh?: boolean | string | string[] | RefreshConfig | RefreshConfig[];
    /**
     * Transform the code while serving.
     */
    transformOnServe?: (code: string, url: DevServerUrl) => string;
}
interface RefreshConfig {
    paths: string[];
    config?: FullReloadConfig;
}
interface ComboPlugin extends Plugin {
    config: (config: UserConfig, env: ConfigEnv) => UserConfig;
}
type DevServerUrl = `${"http" | "https"}://${string}:${number}`;
export declare const refreshPaths: string[];
/**
 * Vite plugin.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
export default function combo(config: string | string[] | PluginConfig): [ComboPlugin, ...Plugin[]];
export {};
