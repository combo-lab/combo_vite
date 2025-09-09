# User guide of Combo.Vite

> Based on the original document -
> [Asset Bundling (Vite)](https://laravel.com/docs/12.x/vite) by Laravel team.

## Introduction

Vite is a modern frontend build tool that provides an extremely fast development environment and bundles your code for production. When building applications with Combo, you will typically use Vite to bundle your application's CSS and JavaScript files into production-ready assets.

`Combo.Vite` integrates seamlessly with Vite by providing:

- the vite plugin - `vite-plugin-combo` for building assets
- the components of server-side templates for loading assets

## Installation & Setup

> The following docs introduces how to manually install and configure `Combo.Vite` for Combo projects. However, Combo's project generator - `combo_new` already include all of this scaffolding and are the fastest way to get started with Combo and Vite.

### Installing Node

You must ensure that Node.js (20+) and NPM are installed:

```console
$ node -v
$ npm -v
```

### Configuring `vite-plugin-combo`

Vite is configured via a `vite.config.js` file in the `assets/` directory of your project. You are free to customize this file based on your needs, and you may also install any other plugins your application requires, such as `@vitejs/plugin-react` or `@vitejs/plugin-vue`.

`vite-plugin-combo` requires you to specify the entry points for your application. These may be CSS or JavaScript files, and include preprocessed languages such as TypeScript, JSX, TSX, and Sass.

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [combo(["src/css/app.css", "src/js/app.js"])],
})
```

If you are building an SPA, including applications built using Inertia, Vite works best without CSS entry points:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [combo(["src/js/app.js"])],
})
```

Instead, you should import your CSS via JavaScript.Typically, this would be done in your application's `src/js/app.js` file:

```js
import "../css/app.css"
```

The `vite-plugin-combo` also supports multiple entry points and advanced configuration options such as [SSR entry points](#ssr).

#### Working with a secure development server

If your local development web server is serving your application via HTTPS, you may run into issues connecting to the Vite development server. In this case, you should generate a trusted certificate and manually configure Vite to use the generated certificates:

```js
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

If you are unable to generate a trusted certificate for your system, you may install and configure the [@vitejs/plugin-basic-ssl](https://github.com/vitejs/vite-plugin-basic-ssl) plugin. When using untrusted certificates, you will need to accept the certificate warning for Vite's development server in your browser by following the "Local" link in your console when running the `npm run dev` command.

### Loading your scripts and styles

With your Vite entry points configured, you may now reference them in a `<.vite_asset />` component that you add to the `<head>` of your application's root template:

```ceex
<!DOCTYPE html>
<head>
  <!-- ... -->
  <.vite_asset name="src/css/app.css" />
  <.vite_asset name="src/js/app.js" />
</head>
```

If you're importing your CSS via JavaScript, you only need to reference the JavaScript entry point:

```ceex
<!DOCTYPE html>
<head>
  <!-- ... -->
  <.vite_asset name="src/js/app.js" />
</head>
```

In dev mode, the `<.vite_asset>` component will automatically detect the Vite development server and inject the Vite client to enable Hot Module Replacement. In build mode, the component will load your compiled and versioned assets, including any imported CSS.

#### Inline assets

Sometimes it may be necessary to include the raw content of assets rather than linking to the versioned URL of the asset. For example, you may need to include asset content directly into your page when passing HTML content to a PDF generator. You may output the content of Vite assets using the `<.vite_inline_asset />` component:

```ceex
<!doctype html>
<head>
  <!-- ... -->
  <style>
    <.vite_inline_asset name="src/css/app.css" />
  </style>
  <script>
    <.vite_inline_asset name="src/js/app.js" />
  </script>
</head>
```

## Running Vite

There are two ways you can run Vite. You may run the development server via the `dev` command, which is useful while developing locally. The development server will automatically detect changes to your files and instantly reflect them in any open browser windows.

Or, running the `build` command will version and bundle your application's assets and get them ready for you to deploy to production:

```console
# Run the Vite development server...
$ npm run dev

# Build and version the assets for production...
$ npm run build
```

## Working with JavaScript

### Aliases

By default, The `vite-plugin-combo` provides a common alias to help you hit the ground running and conveniently import your application's assets:

```js
{
  '@': '/src'
}
```

You may overwrite the `'@'` alias by adding your own to the `vite.config.js` configuration file:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [combo(["src/js/app.jsx"])],
  resolve: {
    alias: {
      "@": "/src/js",
    },
  },
})
```

### React

If you would like to build your frontend using the [React](https://reactjs.org/) framework, then you will also need to install the `@vitejs/plugin-react` plugin:

```console
$ npm install --save-dev @vitejs/plugin-react
```

You may then include the plugin in your `vite.config.js` configuration file:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [combo(["src/js/app.jsx"]), react()],
})
```

You will need to ensure that any files containing JSX have a `.jsx` or `.tsx` extension, remembering to update your entry point, if required.

You will also need to include the additional `<.vite_react_refresh />` component alongside your existing `<.vite_asset>` component.

```ceex
<!DOCTYPE html>
<head>
  <!-- ... -->
  <.vite_react_refresh />
  <.vite_asset name="src/js/app.jsx" />
</head>
```

> The `<.vite_react_refresh>` component must be called before the `<.vite_asset>` component.

### Vue

If you would like to build your frontend using the [Vue](https://vuejs.org/) framework, then you will also need to install the `@vitejs/plugin-vue` plugin:

```console
$ npm install --save-dev @vitejs/plugin-vue
```

You may then include the plugin in your `vite.config.js` configuration file. There are a few additional options you will need when using the Vue plugin with Combo:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [
    combo(["src/js/app.js"]),
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

When using Vite and referencing assets in your application's HTML, CSS, or JS, there are a couple of caveats to consider.

First, if you reference assets with an absolute path, Vite will not include the asset in the build; therefore, you should ensure that the asset is available in your public directory. You should avoid using absolute paths when using a [dedicated CSS entrypoint](#configuring-vite) because, during development, browsers will try to load these paths from the Vite development server, where the CSS is hosted, rather than from your public directory.

When referencing relative asset paths, you should remember that the paths are relative to the file where they are referenced. Any assets referenced via a relative path will be re-written, versioned, and bundled by Vite.

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

## Working with Stylesheet

### CSS

TODO

### Tailwind

TODO

- https://laravel.com/docs/12.x/vite#working-with-stylesheets
- inspect the generated Laravel app and see how it is configured.

## Working with CEEx and routes

When your application is built using traditional server-side rendering with CEEx templates, there're many ways to improve your development workflow.

### Processing static assets with Vite

When referencing assets in your JavaScript or CSS, Vite automatically processes and versions them. In addition, Vite can also process and version static assets that you reference solely in CEEx templates.

However, in order to accomplish this, you need to make Vite aware of your assets by importing the static assets in the application's entry point. For example, if you want to process and version all images stored in `src/images` and all fonts stored in `src/fonts`, you should add the following in your application's `src/js/app.js` entry point:

```js
import.meta.glob([
  // all images
  "../images/**",
  // all fonts
  "../fonts/**",
])
```

These assets will now be processed by Vite when running `npm run build`. You can then reference these assets in CEEx templates using the `vite_url/1` function, which will return the versioned URL for a given asset.

### Refreshing on save

TODO: rewrite this section

`vite-plugin-combo` can automatically refresh the browser when you make changes to view files in your application. To get started, you can simply specify the refresh option as true:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [
    combo({
      // ...
      refresh: true,
    }),
  ],
})
```

When the `refresh` option is `true`, saving files in the following directories will trigger the browser to perform a full page refresh while you are running `npm run dev`:

- `app/Livewire/**`
- `app/View/Components/**`
- `lang/**`
- `resources/lang/**`
- `resources/views/**`
- `routes/**`

TODO: change this to empty, and let users to set it manually.

Watching the `routes/**` directory is useful if you are utilizing [Ziggy](https://github.com/tighten/ziggy) to generate route links within your application's frontend.

If these default paths do not suit your needs, you can specify your own list of paths to watch:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [
    combo({
      // ...
      refresh: ["resources/views/**"],
    }),
  ],
})
```

Under the hood, the `vite-plugin-combo` uses the `vite-plugin-full-reload` package, which offers some advanced configuration options to fine-tune this feature's behavior. If you need this level of customization, you may provide a config definition:

```js
import { defineConfig } from "vite"
import combo from "vite-plugin-combo"

export default defineConfig({
  plugins: [
    combo({
      // ...
      refresh: [
        {
          paths: ["path/to/watch/**"],
          config: { delay: 300 },
        },
      ],
    }),
  ],
})
```

### Aliases

TODO:https://laravel.com/docs/12.x/vite#blade-aliases

## Asset prefetching

https://laravel.com/docs/12.x/vite#asset-prefetching

## ...
