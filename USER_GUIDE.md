# User Guide

> Based on the original document -
> [Asset Bundling (Vite)](https://laravel.com/docs/12.x/vite) by Laravel team.

> The following documentation discusses how to manually install and configure `Combo.Vite`.
> However, Combo's project generator - [combo_new](https://github.com/combo-lab/combo_new), already includes all of this scaffolding and are the fastest way to get started with Combo and Vite.

## Introduction

[Vite](https://vitejs.dev/) is a modern frontend build tool that provides a fast development environment and bundles your code for production. When building applications with Combo, you will typically use Vite to bundle your application's CSS and JS files into production-ready assets.

`Combo.Vite` integrates seamlessly with Vite by providing:

- a vite plugin - `vite-plugin-combo` for building assets
- several components and functions for loading assets

## Installation & Setup

> The following docs introduces how to manually install and configure `Combo.Vite` for Combo projects. However, Combo's project generator - `combo_new` already include all of this scaffolding and are the fastest way to get started with Combo and Vite.

### Installing Node

You must ensure that Node.js (20+) and NPM are installed:

```
$ node -v
$ npm -v
```

### Installing `Combo.Vite`

Add `:combo_vite` to the list of dependencies in `mix.exs`:

```elixir
def deps do
  [
    {:combo_vite, "<requirement>"}
  ]
end
```

And, install it by running `mix deps.get`.

### Setting up `Combo.Vite`

Add following code into the `html_helpers/0` function of your endpoint:

```elixir
defmodule Demo.Web do
  # ...

  defp html_helpers do
    quote do
      # ...

      use Combo.Vite.HTML,
        endpoint: Demo.Web.Endpoint,
        static_dir: {:demo, "priv/static"}

      # ...
    end
  end

  # ...
end
```

After that, the generated components and functions will be available in inline templates and template files.

### Installing `vite-plugin-combo`

Add `vite-plugin-combo` as a development dependency of your `package.json`:

```json
{
  "devDependencies": {
    // ...
    "vite-plugin-combo": "file:../deps/combo_vite/npm-packages/vite-plugin-combo"
  }
}
```

And, install it:

```
$ npm run install --install-links
```

> By default, NPM packages from local paths are installed by symlinking the local paths, and they will not have their own dependencies installed when `npm install` is ran in current project.
> We must use `npm install --install-links`, which will install package from local path like installing a package from the registry instead of creating a symlink.

### Setting up `vite-plugin-combo`

<a name="configuring-vite-plugin"></a>

Vite is configured via a `vite.config.js` configuration file in the `assets/` directory of your project. You are free to customize this file based on your needs, and you may also install any other plugins your application requires, such as `@vitejs/plugin-react` or `@vitejs/plugin-vue`.

`vite-plugin-combo` requires you to specify the entry points for your application. These may be CSS or JavaScript files, and include preprocessed languages such as TypeScript, JSX, TSX, and Sass.

```javascript
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [
    combo({
      input: ["src/css/app.css", "src/js/app.js"],
    }),
  ],
})
```

If you are building an SPA, including applications built using Inertia, Vite works best without CSS entry points:

```diff
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [
    combo({
      input: [
-        "src/css/app.css",
+        "src/js/app.js",
      ],
    }),
  ],
})
```

Instead, you should import your CSS via JavaScript. Typically, this would be done in your application's `src/js/app.js` file:

```diff
+ import "../css/app.css"
```

The `vite-plugin-combo` also supports multiple entry points and advanced configuration options such as [SSR entry points](#ssr).

#### Working with a secure development server

If your local development web server is serving your application via HTTPS, due to [the browser's mixed content policy](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content), you may run into issues connecting to the Vite development server. In this case, you should also configure Vite to serve assets via HTTPS.

If you can generate a trusted certificate, you can manually configure Vite to use the generated certificates:

```javascript
// ...
import fs from "fs"

const host = "my-app.test"

export default defineConfig({
  // ...
  server: {
    host,
    hmr: { host },
    https: {
      key: fs.readFileSync(`/path/to/${host}.key`),
      cert: fs.readFileSync(`/path/to/${host}.crt`),
    },
  },
})
```

If you are unable to generate a trusted certificate, you can try to install and configure the [@vitejs/plugin-basic-ssl](https://github.com/vitejs/vite-plugin-basic-ssl) plugin. When using untrusted certificates, you will need to accept the certificate warning for Vite development server in your browser by following the "Local" link in your console when running the `npm run dev` command.

### Adding necessary NPM scripts

Add follow content to your `package.json`:

```javascripton
{
  // ...
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
  // ...
}
```

### Configuring Combo's watcher for Vite

To make Vite start together with `mix combo.serve`, we need to configure Combo watchers:

```elixir
config :demo, Demo.Web.Endpoint,
  # ...
  watchers: [
    npm: [
      "run",
      "dev",
      cd: Path.expand("../assets", __DIR__)
    ]
  ],
  # ...
```

### Disabling Combo's builtin versioned assets

Disable it by removing `:cache_static_manifest` configuration of endpoint, because `Combo.Vite` has supported versioned assets.

```diff
- config :demo, Demo.Web.Endpoint, cache_static_manifest: "priv/static/cache_manifest.json"
```

And, you don't need to use `mix combo.digest` any more.

### Configuring the entry points

If you haven't disabled the [module preload polyfill](https://vite.dev/config/build-options#build-polyfillmodulepreload), you need to import the polyfill in your entry points:

```javascript
// add it at the beginning of your src/js/app.js
import "vite/modulepreload-polyfill"
```

### Loading your scripts and styles

With your Vite entry points configured, you may now reference them in a `<.vite_assets />` component that you add to the `<head>` of your application's root template:

```ceex
<!DOCTYPE html>
<head>
  <!-- ... -->
  <.vite_assets names={["src/css/app.css", "src/js/app.js"]} />
</head>
```

If you're importing your CSS via JavaScript, you only need to reference the JavaScript entry point:

```ceex
<!DOCTYPE html>
<head>
  <!-- ... -->
  <.vite_assets names={["src/js/app.js"]} />
</head>
```

In dev mode, the `<.vite_assets />` component will automatically detect the Vite development server and inject the `@vite/client` to enable Hot Module Replacement. In build mode, the component will load the compiled and versioned assets, including any imported CSS.

#### Inline assets

Sometimes it may be necessary to include the raw content of assets rather than linking to the versioned URL of the asset. For example, you may need to include asset content directly into your page when passing HTML content to a PDF generator. You may output the content of Vite assets using the `vite_content/1` function.

```ceex
<!doctype html>
<head>
  <!-- ... -->
  <style>
    {raw vite_content("src/css/app.css")}
  </style>
  <script>
    {raw vite_content("src/js/app.js")}
  </script>
</head>
```

## Running Vite

There are two ways you can run Vite.

You can run the development server via the `dev` command, which is useful while developing locally. The development server will automatically detect changes to your files and instantly reflect them in any open browser windows.

Or, running the `build` command will version and bundle your application's assets and get them ready for you to deploy to production:

```
# Run the Vite development server
$ npm run dev

# Build and version the assets for production
$ npm run build
```

## Working with JavaScript

### Aliases

By default, The `vite-plugin-combo` provides a common alias to help you hit the ground running and conveniently import your application's assets:

```javascript
{
  "@": "/src"
}
```

You may overwrite the `"@"` alias by adding your own to the `vite.config.js` configuration file:

```javascript
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [
    combo({
      input: ["src/js/app.jsx"],
    }),
  ],
  resolve: {
    alias: {
      "@": "/src/js",
    },
  },
})
```

### React

If you would like to build your frontend using the [React](https://reactjs.org/) framework, then you will also need to install the `@vitejs/plugin-react` plugin:

```
$ npm install --save-dev @vitejs/plugin-react
```

You may then include the plugin in your `vite.config.js` configuration file:

```javascript
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [
    combo({
      input: ["src/js/app.jsx"],
    }),
    react(),
  ],
})
```

You will need to ensure that any files containing JSX have a `.jsx` or `.tsx` extension, remembering to update your entry point, if required.

You will also need to include the additional `<.vite_react_refresh />` component alongside your existing `<.vite_assets />` component.

```ceex
<!DOCTYPE html>
<head>
  <!-- ... -->
  <.vite_react_refresh />
  <.vite_assets names={["src/js/app.jsx"]} />
</head>
```

> The `<.vite_react_refresh />` component must be called before the `<.vite_assets />` component.

### Vue

If you would like to build your frontend using the [Vue](https://vuejs.org/) framework, then you will also need to install the `@vitejs/plugin-vue` plugin:

```
$ npm install --save-dev @vitejs/plugin-vue
```

You may then include the plugin in your `vite.config.js` configuration file. There are a few additional options you will need when using the Vue plugin with Combo:

```javascript
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [
    combo({
      input: ["src/js/app.js"],
    }),
    vue({
      template: {
        transformAssetUrls: {
          // The Vue plugin will re-write asset URLs, when referenced
          // in Single File Components, to point to the Combo web
          // server. Setting this to `null` allows the vite-plugin-combo
          // to instead re-write asset URLs to point to the Vite
          // server instead.
          base: null,

          // The Vue plugin will parse absolute URLs and treat them
          // as absolute paths to files on disk. Setting this to
          // `false` will leave absolute URLs un-touched so they can
          // reference assets in the public directory as expected.
          includeAbsolute: false,
        },
      },
    }),
  ],
})
```

### URL processing

<a name="url-processing"></a>

When using Vite and referencing assets in your application's HTML, CSS, or JavaScript, there are a couple of caveats to consider.

First, if you reference assets with an absolute path, Vite will not include the asset in the build. Therefore:

- you should ensure that the asset is available in your public directory.
- you should avoid using absolute paths when using a [dedicated CSS entrypoint](#configuring-vite-plugin) because, during development, browsers will try to load these paths from the Vite development server, where the CSS is hosted, rather than from your public directory.

Second, any assets referenced via a relative path will be re-written, versioned, and bundled by Vite. When referencing relative asset paths, you should remember that the paths are relative to the file where they are referenced.

Consider the following project structure:

```
priv/static/
  lisa.png
assets/src/
  js/
    Pages/
      Welcome.vue
  images/
    bart.png
```

The following example demonstrates how Vite will treat relative and absolute URLs:

```html
<!-- This asset is not handled by Vite and will not be included in the build -->
<img src="/lisa.png" />

<!-- This asset will be re-written, versioned, and bundled by Vite -->
<img src="../../images/bart.png" />
```

## Working with stylesheet

### CSS

No configuration is required.

### Tailwind CSS

Install Tailwind CSS. Add Vite plugin and its peer dependencies to your `package.json`:

```json
{
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

Configure the Vite plugin. Add the `@tailwindcss/vite` plugin to the `vite.config.js` configuration file:

```diff
  import { defineConfig } from "vite"
  import combo from "vite-plugin-combo"
+ import tailwindcss from "@tailwindcss/vite"

  export default defineConfig({
    plugins: [
      combo({
        input: ["src/css/app.css", "src/js/app.js"],
      }),
+     tailwindcss(),
    ],
  })
```

Import Tailwind CSS. Add an `@import` to `src/css/app.css` that imports Tailwind CSS. Additionally, tell Tailwind CSS to scan some directories for utilities:

```css
@import "tailwindcss";

@source "../css";
@source "../js";
@source "../../../lib/demo/web";
```

Now, you can start to use Tailwind CSS's utility classes to style your content.

## Working with server-side routes and templates

When your application is built using traditional server-side rendering with CEEx templates, there're several ways to improve your development workflow.

### Processing static assets with Vite

When referencing assets in your CSS or JavaScript, Vite automatically processes and versions them.

In addition, Vite can also process and version static assets that you reference solely in CEEx templates. However, in order to accomplish this, you need to make Vite aware of your assets by importing the static assets into the application's entry point. For example, if you want to process and version all images stored in `src/images` and all fonts stored in `src/fonts`, you should add the following in your application's `src/js/app.js` entry point:

```javascript
import.meta.glob(["../images/**", "../fonts/**"])
```

These assets will now be processed by Vite. You can then reference these assets in CEEx templates using the `vite_url/1` function, which will return the versioned URL for a given asset:

```ceex
<img src={vite_url("src/images/logo.png")} />
```

### Refreshing on save

Configure `Combo.LiveReloader` to refresh the page when you make changes to specified files:

```elixir
config :demo, Demo.Web.Endpoint,
  check_origin: false,
  live_reloader: [
    patterns: [
      ~r"lib/demo/web/router\.ex",
      ~r"lib/demo/web/(controllers|layouts|components)/.*\.(ex|ceex)$"
    ]
  ]
```

Then, changing files in above directories will trigger the browser to refresh page.

> Watching the `routes.ex` is useful if you are utilizing [Ziggy](https://github.com/tighten/ziggy) to generate route links within your application's frontend.
> TODO - is it necessary and possible to build a Ziggy-like package for Combo?

## Asset prefetching

Currently not supported, but might be implemented later. PRs are welcome.

TODO - https://laravel.com/docs/12.x/vite#asset-prefetching

## Custom base URLs

If your Vite compiled assets are deployed to a domain separate from your application, such as via a CDN, you must specify the `ASSETS_BASE_URL` environment variable before building the assets:

```
ASSETS_BASE_URL=https://cdn.example.com
```

After configuring the base URL, all re-written URLs to your assets will be prefixed with the configured value:

```
https://cdn.example.com/build/assets/app.9dce8d17.js
```

And, remember that [absolute URLs are not re-written by Vite](#url-processing), so they will not be prefixed.

## Environment variables

You can inject environment variables into your JavaScript.

To prevent accidentally leaking env variables to the client, only variables prefixed with `VITE_` are exposed to your Vite-processed code. For example, for the following env variables:

```
VITE_SENTRY_DSN_PUBLIC=http://example.com
DB_PASSWORD=***secret***
```

Only `VITE_SOME_KEY` will be exposed on `import.meta.env` to your client source code, but `DB_PASSWORD` will not:

```javascript
import.meta.env.VITE_SENTRY_DSN_PUBLIC
```

Read [the doc of Vite's Env Variables](https://vite.dev/guide/env-and-mode.html#env-variables) for more information.

## Disabling Vite in tests

Currently not supported, but might be implemented later. PRs are welcome.

TODO - https://laravel.com/docs/12.x/vite#disabling-vite-in-tests

## Server-Side Rendering (SSR)

<a name="ssr"></a>

TODO - https://laravel.com/docs/12.x/vite#ssr

## Script and Style Tag Attributes

TODO - https://laravel.com/docs/12.x/vite#script-and-style-attributes

## Advanced Customization

Out of the box, `Combo.Vite` and `vite-plugin-combo` use sensible conventions that should work for the majority of applications.

However, sometimes you may need to customize them. To do that, please refer to the doc of them.

### Configuring CORS for Vite development server

If you are experiencing CORS (Cross-Origin Resource Sharing) issues in the browser while fetching assets from the Vite development server, you may need to grant your custom origin access to the Vite development server. `vite-plugin-combo` allows the following origins without any additional configuration:

- origins having hostname `localhost`
- origins having hostname `*.localhost`
- origins having hostname `127.0.0.1`
- origins having hostname `::1`
- origins having hostname `*.test`

If you need more fine-grained control over the origins, you should utilize [Vite's comprehensive and flexible built-in CORS server configuration](https://vite.dev/config/server-options.html#server-cors). For example, if you are visiting your app via `http://demo-app.combo`, you can specify the origin in the `server.cors.origin` configuration option in the project's `vite.config.js` configuration file:

```javascript
import { defineConfig } from "vite"
// ...

export default defineConfig({
  // ...
  server: {
    cors: {
      origin: ["http://demo-app.combo"],
    },
  },
  // ...
})
```

You may also include regex patterns, which can be helpful if you would like to allow all origins for a given top-level domain, such as `*.combo`:

```javascript
import { defineConfig } from "vite"
// ...

export default defineConfig({
  // ...
  server: {
    cors: {
      origin: [
        // Supports: SCHEME://DOMAIN.combo[:PORT]
        /^https?:\/\/.*\.combo(:\d+)?$/,
      ],
    },
  },
  // ...
})
```

### Correcting Vite development server URLs

Some plugins within the Vite ecosystem assume that URLs which begin with a forward-slash will always point to the Vite development server. However, due to the nature of the Combo integration, this is not the case.

For example, the `vite-imagetools` plugin outputs URLs like the following while Vite is serving your assets:

```html
<img src="/@imagetools/f0b2f404b13f052c604e632f2fb60381bf61a520" />
```

The `vite-imagetools` plugin is expecting that the output URL will be intercepted by Vite and the plugin may then handle all URLs that start with `/@imagetools`. If you are using plugins that are expecting this behavior, you will need to manually correct the URLs. You can do this in the `vite.config.js` configuration file by using the `transformOnServe` option.

In this particular example, we will prepend the Vite development server URL to all occurrences of `/@imagetools` within the generated code:

```javascript
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"
import { imagetools } from "vite-imagetools"

export default defineConfig({
  plugins: [
    combo({
      // ...
      transformOnServe: (code, devServerUrl) =>
        code.replaceAll("/@imagetools", devServerUrl + "/@imagetools"),
    }),
    imagetools(),
  ],
})
```

Now, while Vite is serving assets, it will output URLs that point to the Vite development server:

```diff
- <img src="/@imagetools/f0b2f404b13f052c604e632f2fb60381bf61a520">
+ <img src="http://[::1]:5173/@imagetools/f0b2f404b13f052c604e632f2fb60381bf61a520">
```
