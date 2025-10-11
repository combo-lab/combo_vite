defmodule Combo.Vite.HTML do
  @moduledoc """
  Provides Vite related components and helpers for rendering HTML.

  ## Usage

  Add following code into the `html_helpers/0` function:

      defmodule MyApp.Web do
        # ...

        defp html_helpers do
          quote do
            # ...

            import Combo.Vite.HTML

            # ...
          end
        end

        # ...
      end

  """

  use Combo.HTML
  import Combo.Vite.CacheHelper
  alias Combo.Vite.Manifest
  alias Combo.Vite.URLAccessError
  alias Combo.Vite.FileNotFoundError

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
  attr :names, :list, required: true

  def vite_assets(%{names: names} = assigns) do
    names = Enum.map(names, &remove_leading_slash/1)
    config = fetch_config!()

    assigns = assign(assigns, :names, names)
    assigns = assign(assigns, :config, config)

    if running_hot?(config),
      do: vite_on_dev_server(assigns),
      else: vite_on_manifest(assigns)
  end

  @doc """
  Renders an element for a given asset.

  Different from `vite_assets/1`, it doesn't loads the `@vite/client`. All
  other behaviors are the same.

  ## Examples

  ```ceex
  <.vite_asset name="src/css/app.css" />
  ```
  """
  attr :name, :string, required: true

  def vite_asset(%{name: name} = assigns) do
    name = remove_leading_slash(name)
    config = fetch_config!()

    assigns = assign(assigns, :name, name)
    assigns = assign(assigns, :config, config)

    if running_hot?(config),
      do: vite_on_dev_server(assigns),
      else: vite_on_manifest(assigns)
  end

  @doc """
  Renders script element for React refresh runtime, only when the Vite dev
  server is running.

  ## Examples

  ```ceex
  <.vite_react_refresh />
  ```
  """
  attr :config, :map, required: true
  attr :rest, :global

  def vite_react_refresh(assigns) do
    config = fetch_config!()
    assigns = assign(assigns, :config, config)

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
  Gets the running mode of Vite.

  Possible values are `:dev` and `:prod`.

  ## Examples

      vite_mode() == :dev
      vite_mode() == :prod

  """
  def vite_mode do
    config = fetch_config!()
    if running_hot?(config), do: :dev, else: :prod
  end

  @doc """
  Gets the URL of a given asset.

  ## Examples

  ```ceex
  <img src={vite_url("src/images/logo.png")} />
  ```
  """
  def vite_url(name) do
    name = remove_leading_slash(name)
    config = fetch_config!()

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

  Put content into normal tags:
  ```ceex
  <div>
    {raw vite_content("src/images/logo.svg")}
  </div>
  ```

  Put content into style and script tags:

  ```ceex
  <style>
    <%= raw vite_content("src/css/app.css")} %>
  </style>
  <script>
    <%= raw vite_content("src/js/app.js")} %>
  </script>
  ```
  """
  def vite_content(name) do
    name = remove_leading_slash(name)
    config = fetch_config!()

    if running_hot?(config) do
      read_content_from_dev_server!(name, config)
    else
      read_content_from_built_file!(name, config)
    end
  end

  defp fetch_config! do
    if config = Process.get(:combo_vite_config) do
      config
    else
      raise """
      Unable to fetch the config of Combo.Vite, \
      make sure Combo.Vite.Plug is configured correctly\
      """
    end
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

  defp read_content_from_dev_server!(name, config) do
    base_url = fetch_dev_server_base_url!(config)
    url = Path.join(base_url, name)

    case :httpc.request(url) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        to_string(body)

      {:ok, {{_, status_code, _}, _headers, _body}} ->
        raise URLAccessError, {url, status_code: status_code}

      {:error, reason} ->
        raise URLAccessError, {url, reason: reason}
    end
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
    static_url_configured? = config.endpoint.config(:static_url)
    path = Path.join(["/", config.build_dir, file])

    if static_url_configured? do
      config.endpoint.static_url() <> config.endpoint.static_path(path)
    else
      config.endpoint.static_path(path)
    end
  end

  defp read_content_from_built_file!(name, config) do
    manifest = fetch_manifest!(config)
    chunk = Manifest.fetch_chunk!(manifest, name)
    path = Path.join(out_dir(config), chunk.file)
    fetch_file_content!(path, config)
  end

  ## Helpers

  defp remove_leading_slash(name), do: Path.relative(name)

  defp out_dir(config), do: Path.join(resolve_path(config.static_dir), config.build_dir)
  defp hot_file(config), do: Path.join(resolve_path(config.static_dir), config.hot_filename)
  defp manifest_file(config), do: Path.join(out_dir(config), config.manifest_filename)

  defp resolve_path({app, path}), do: Path.join([Application.app_dir(app), path])

  defp running_hot?(config) do
    hot_file = hot_file(config)
    key = {__MODULE__, config.endpoint, :running_hot?}

    cached_fetch!(key, fn ->
      File.exists?(hot_file)
    end)
  end

  defp fetch_dev_server_base_url!(config) do
    hot_file = hot_file(config)
    key = {__MODULE__, config.endpoint, :dev_server_base_url}

    cached_fetch!(key, fn ->
      case File.read(hot_file) do
        {:ok, content} -> String.trim(content)
        {:error, reason} -> raise FileNotFoundError, {hot_file, reason}
      end
    end)
  end

  defp fetch_manifest!(config) do
    manifest_file = manifest_file(config)
    key = {__MODULE__, config.endpoint, :manifest}

    cached_fetch!(key, fn ->
      case File.read(manifest_file) do
        {:ok, content} -> Manifest.parse(content)
        {:error, reason} -> raise FileNotFoundError, {manifest_file, reason}
      end
    end)
  end

  defp fetch_file_content!(path, config) do
    key = {__MODULE__, config.endpoint, :file_content, path}

    cached_fetch!(key, fn ->
      case File.read(path) do
        {:ok, content} -> content
        {:error, reason} -> raise FileNotFoundError, {path, reason}
      end
    end)
  end

  attr :file, :string, required: true
  attr :to_url, {:fun, 2}, required: true
  attr :config, :map, required: true
  attr :rest, :global

  defp tag(assigns) do
    ~CE"""
    <%= if css?(@file) do %>
      <link rel="stylesheet" href={apply(@to_url, [@file, @config])} {@rest} />
    <% else %>
      <script type="module" src={apply(@to_url, [@file, @config])} {@rest}>
      </script>
    <% end %>
    """
  end

  defp css?(name) do
    Regex.match?(~r/\.(css|less|sass|scss|styl|stylus|pcss|postcss)(\?[^\.]*)?$/, name)
  end
end
