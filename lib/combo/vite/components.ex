defmodule Combo.Vite.Components do
  @moduledoc """
  Provides Vite related components.

  ## Usage

  Add following code into the html_helpers function of your endpoint:

      defmodule Demo.Web do
        # ...

        defp html_helpers do
          quote do
            # ...

            use Combo.Vite.Components,
              endpoint: Demo.Web.Endpoint,
              static_dir: {:demo, "priv/static"}

            # ...
          end
        end

        # ...
      end

  Then, all the components and helper functions will be available in your
  inline templates or template files.

  ## Options

    * `:endpoint` (required) - the app's endpoint.
    * `:static_dir` (required) -
    * `:build_dir` - Default to `"build"`.
    * `:hot_filename` - Default to `"__hot__"`.
    * `:manifest_filename` - Default to `"manifest.json"`.

  ## References

    * [Vite - Guide - Backend Integration\
      ](https://vite.dev/guide/backend-integration.html)
    * [`Illuminate/Foundation/Vite.php` from Laravel\
      ](https://github.com/laravel/framework/blob/12.x/src/Illuminate/Foundation/Vite.php)


  """
  use Combo.HTML
  alias Combo.Vite.Manifest

  defmacro __using__(opts) do
    # opts =
    #   if Keyword.keyword?(opts) do
    #     for {k, v} <- opts do
    #       if Macro.quoted_literal?(v) do
    #         {k, Macro.prewalk(v, &expand_alias(&1, __CALLER__))}
    #       else
    #         {k, v}
    #       end
    #     end
    #   else
    #     opts
    #   end

    config_ast = build_config_ast(opts)

    quote do
      @combo_vite_config unquote(Macro.expand(config_ast, __CALLER__))

      attr :names, :list, required: true

      def vite_assets(assigns) do
        assigns = assign(assigns, :config, combo_vite_config())
        unquote(__MODULE__).vite_assets(assigns)
      end

      attr :name, :string, required: true

      def vite_asset(assigns) do
        assigns = assign(assigns, :config, combo_vite_config())
        unquote(__MODULE__).vite_asset(assigns)
      end

      attr :rest, :global

      def vite_react_refresh(assigns) do
        assigns = assign(assigns, :config, combo_vite_config())
        unquote(__MODULE__).vite_react_refresh(assigns)
      end

      def vite_url(name) do
        unquote(__MODULE__).vite_url(name, combo_vite_config())
      end

      def vite_content(name) do
        unquote(__MODULE__).vite_url(name, combo_vite_config())
      end

      defp combo_vite_config, do: @combo_vite_config
    end
  end

  defp build_config_ast(opts) do
    known_keys = [:endpoint, :static_dir, :build_dir, :hot_filename, :manifest_filename]
    required_keys = [:endpoint, :static_dir]

    for {key, _value} <- opts do
      if key not in known_keys do
        raise ArgumentError, "Unknown option: #{inspect(key)}"
      end
    end

    for key <- required_keys do
      if not Keyword.has_key?(opts, key) do
        raise ArgumentError, "Missing required option: #{inspect(key)}"
      end
    end

    endpoint = Keyword.fetch!(opts, :endpoint)
    static_dir = read_path_opt!(opts, :static_dir)
    build_dir = opts |> Keyword.get(:build_dir, "build") |> String.trim("/")
    hot_filename = Keyword.get(opts, :hot_filename, "__hot__")
    manifest_filename = Keyword.get(opts, :manifest_filename, "manifest.json")

    {:%{}, [],
     [
       endpoint: endpoint,
       static_dir: static_dir,
       build_dir: build_dir,
       hot_filename: hot_filename,
       manifest_filename: manifest_filename
     ]}
  end

  defp read_path_opt!(opts, name) do
    case Keyword.fetch!(opts, name) do
      app when is_atom(app) -> {app, "priv/static"}
      path when is_binary(path) -> path
      {_, _} = app_and_path -> app_and_path
      _ -> raise ArgumentError, "#{inspect(name)} must be an atom, a binary or a tuple"
    end
  end

  @doc """
  Renders elements for given assets.

  This component auto-detects the mode of Vite and behaves accordingly:

    * In dev mode, it loads the `@vite/client` (for Hot Module Replacement)
      and the given assets.
    * In build mode, it loads the compiled and versioned assets, including any
      imported CSS.

  ## Examples

  ```ceex
  <.vite_assets names={["src/css/app.css", "src/js/app.js"]} />
  ```
  """
  attr :names, :string, required: true
  attr :config, :map, required: true

  def vite_assets(%{names: names, config: config} = assigns) do
    names = Enum.map(names, &remove_leading_slash/1)
    assigns = assign(assigns, :names, names)

    if running_hot?(config),
      do: vite_on_dev_server(assigns),
      else: vite_on_manifest(assigns)
  end

  @doc """
  Renders an element for a given asset.

  Different from `vite_assets/1`, it dosen't loads the `@vite/client` in dev
  mode. All other behaviors are the same.

  ## Examples

  ```ceex
  <.vite_asset name="src/css/app.css" />
  ```
  """
  attr :name, :string, required: true
  attr :config, :map, required: true

  def vite_asset(%{name: name, config: config} = assigns) do
    name = remove_leading_slash(name)
    assigns = assign(assigns, :name, name)

    if running_hot?(config),
      do: vite_on_dev_server(assigns),
      else: vite_on_manifest(assigns)
  end

  @doc """
  Renders script element for React refresh runtime.

  > Note that the script is generated only when the dev server is running.
  """
  attr :config, :map, required: true
  attr :rest, :global

  def vite_react_refresh(assigns) do
    ~CE"""
    <%= if running_hot?(@config) do %>
      <script type="module" {@rest}>
        import RefreshRuntime from "<%= to_dev_server_url("@react-refresh", @config) %>";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
      </script>
    <% end %>
    """
  end

  @doc """
  Gets the URL of a given asset.

  ## Examples

  ```ceex
  <img src={vite_url("src/images/logo.png")} />
  ```
  """
  def vite_url(name, config) do
    if running_hot?(config) do
      to_dev_server_url(name, config)
    else
      manifest = fetch_manifest!(config)
      chunk = Manifest.fetch_chunk!(manifest, name)
      to_static_url(chunk.file, config)
    end
  end

  @doc """
  Gets the content of a given asset.

  ## Examples

  ```ceex
  <style>
    {raw vite_content("src/css/app.css")}
  </style>
  <script>
    {raw vite_content("src/js/app.js")}
  </script>
  ```
  """
  def vite_content(name, config) do
    name = remove_leading_slash(name)

    manifest = fetch_manifest!(config)
    # throw error if file not found

    chunk = Manifest.fetch_chunk!(manifest, name)
    # throw error if chunk not found

    file = Path.join(out_dir(config), chunk.file)
    # throw error if file not found

    File.read!(file)
  end

  ## For development mode

  defp vite_on_dev_server(%{names: names, config: _config} = assigns) do
    assigns = assign(assigns, :names, ["@vite/client" | names])

    ~CE"""
    <%= for name <- @names do %>
      <.tag file={name} to_url={&to_dev_server_url/2} config={@config} />
    <% end %>
    """
  end

  defp vite_on_dev_server(%{name: _name, config: _config} = assigns) do
    ~CE"""
    <.tag file={@name} to_url={&to_dev_server_url/2} config={@config} />
    """
  end

  defp to_dev_server_url(name, config) do
    base_url = fetch_dev_server_base_url!(config)
    Path.join([base_url, name])
  end

  ## For production mode

  defp vite_on_manifest(%{names: _names, config: config} = assigns) do
    manifest = fetch_manifest!(config)
    assigns = assign(assigns, :manifest, manifest)

    ~CE"""
    <%= for name <- @names do %>
      <.asset_tags name={name} manifest={@manifest} config={@config} />
    <% end %>
    """
  end

  defp vite_on_manifest(%{name: _name, config: config} = assigns) do
    manifest = fetch_manifest!(config)
    assigns = assign(assigns, :manifest, manifest)

    ~CE"""
    <.asset_tags name={@name} manifest={@manifest} config={@config} />
    """
  end

  defp asset_tags(%{name: name, manifest: manifest, config: _config} = assigns) do
    assigns =
      assigns
      |> assign(:name, nil)
      |> assign(:manifest, nil)
      |> assign(:chunk, Manifest.fetch_chunk!(manifest, name))
      |> assign(:imported_chunks, Manifest.fetch_imported_chunks!(manifest, name))

    ~CE"""
    <%= for css <- @chunk.css do %>
      <.tag file={css} to_url={&to_static_url/2} config={@config} />
    <% end %>
    <%= for chunk <- @imported_chunks, css <- chunk.css do %>
      <.tag file={css} to_url={&to_static_url/2} config={@config} />
    <% end %>

    <.tag file={@chunk.file} to_url={&to_static_url/2} config={@config} />

    <%= for chunk <- @imported_chunks do %>
      <.tag file={chunk.file} to_url={&to_static_url/2} config={@config} rel="modulepreload" />
    <% end %>
    """
  end

  defp to_static_url(file, config) do
    static_url_config = config.endpoint.config(:static_url)

    base_url =
      if static_url_config,
        do: struct(URI, static_url_config) |> URI.to_string(),
        else: "/"

    Path.join([base_url, config.build_dir, file])
  end

  ## Helpers

  defp remove_leading_slash(name), do: Path.relative(name)

  defp out_dir(config), do: Path.join(resolve_path(config.static_dir), config.build_dir)
  defp hot_file(config), do: Path.join(resolve_path(config.static_dir), config.hot_filename)
  defp manifest_file(config), do: Path.join(out_dir(config), config.manifest_filename)

  defp resolve_path({app, path}), do: Path.join([Application.app_dir(app), path])
  defp resolve_path(path), do: path

  defp running_hot?(config) do
    hot_file = hot_file(config)
    key = {__MODULE__, hot_file, :running_hot?}

    cached_fetch!(key, fn ->
      File.exists?(hot_file)
    end)
  end

  defp fetch_dev_server_base_url!(config) do
    hot_file = hot_file(config)
    key = {__MODULE__, hot_file, :dev_server_base_url}

    cached_fetch!(key, fn ->
      hot_file |> File.read!() |> String.trim()
    end)
  end

  defp fetch_manifest!(config) do
    manifest_file = manifest_file(config)
    key = {__MODULE__, manifest_file, :manifest}

    cached_fetch!(key, fn ->
      manifest_file |> File.read!() |> Manifest.parse()
    end)
  end

  defp cached_fetch!(key, fun) when is_function(fun, 0) do
    case :persistent_term.get(key, nil) do
      nil ->
        value = fun.()
        :persistent_term.put(key, value)
        value

      value ->
        value
    end
  end

  attr :file, :string, required: true
  attr :to_url, {:fun, 2}, required: true
  attr :config, :map, required: true
  attr :rest, :global

  defp tag(assigns) do
    ~CE"""
    <%= if is_css(@file) do %>
      <link rel="stylesheet" href={apply(@to_url, [@file, @config])} {@rest} />
    <% else %>
      <script type="module" src={apply(@to_url, [@file, @config])} {@rest}>
      </script>
    <% end %>
    """
  end

  defp is_css(name) do
    Regex.match?(~r/\.(css|less|sass|scss|styl|stylus|pcss|postcss)(\?[^\.]*)?$/, name)
  end
end
