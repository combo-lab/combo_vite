defmodule Combo.Vite do
  @moduledoc """
  Provides Vite integration for Combo.

      config :my_app, MyApp.Web.Endpoint,
        vite: [
          static_dir: {:my_app, "priv/static"}
        ]

  ## Configurations

    * `:static_dir` - the path of public static directory. The value
      of it must be:
      * `{app, path}`, where `app` and `path` will be passed to
        `Application.app_dir(app, path)`.
      * an atom, which is the shortcut for `{app, "priv/static"}`.
    * `:build_dir` - the dirname of a dir for placing built assets.
      Default to `"build"`.
      > Its parent directory is the directory specified by `:static_dir`, and
      > that's immutable.
    * `:hot_file` - the filename of the "hot" file.
      Default to `"__hot__"`.
      > Its parent directory is the directory specified by `:static_dir`. and
      > that's immutable.
    * `:manifest_file` - the filename of the manifest file.
      Default to `"manifest.json"`.
      > Its parent directory is the directory specified by `:build_dir`, and
      > that's immutable.

  ## References

    * [Vite - Guide - Backend Integration\
      ](https://vite.dev/guide/backend-integration.html)
    * [`Illuminate/Foundation/Vite.php` from Laravel\
      ](https://github.com/laravel/framework/blob/12.x/src/Illuminate/Foundation/Vite.php)

  """
end
