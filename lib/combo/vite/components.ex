defmodule Combo.Vite.Components do
  @moduledoc """
  Provides Vite related components.

  ## Usage

  Put the following into your `<head />` of your root layout:

      <Combo.Vite.Components.assets
        names={["js/app.js", "css/app.css"]}
        manifest={{:my_app, "priv/static/.vite/manifest.js"}}
        dev_server={Combo.Vite.Components.has_vite_watcher?(MyAppWeb.Endpoint)}
      />

  If you want to make use of the dev server you need to provide the `to_url` option.

      <Combo.Vite.Components.assets
        names={["js/app.js", "css/app.css"]}
        manifest={{:my_app, "priv/static/.vite/manifest.js"}}
        dev_server={Combo.Vite.Components.has_vite_watcher?(MyAppWeb.Endpoint)}
        to_url={fn p -> static_url(@conn, p) end}
      />

  This also requires having the static_url configured for the endpoint.

      config :myapp, MyAppWeb.Endpoint,
        static_url: [host: "localhost", port: 5173]




    * https://vite.dev/guide/backend-integration.html

  """
  use Combo.HTML
  alias Combo.Vite.Manifest

  defmacro __using__(opts) do
    config_ast = build_config_ast(opts)

    quote do
      @combo_vite_config unquote(Macro.expand(config_ast, __CALLER__))

      attr :entries, :list, required: true

      def vite(assigns) do
        assigns = assign(assigns, :config, combo_vite_config())
        unquote(__MODULE__).vite(assigns)
      end

      attr :entry, :string, required: true

      def vite_content(assigns) do
        assigns = assign(assigns, :config, combo_vite_config())
        unquote(__MODULE__).vite_content(assigns)
      end

      attr :rest, :global

      def vite_react_refresh(assigns) do
        assigns = assign(assigns, :config, combo_vite_config())
        unquote(__MODULE__).vite_react_refresh(assigns)
      end

      def vite_url(key) do
        unquote(__MODULE__).vite_url(key, combo_vite_config())
      end

      defp combo_vite_config, do: @combo_vite_config
    end
  end

  defp build_config_ast(opts) do
    endpoint = Keyword.fetch!(opts, :endpoint)
    static_dir = opts |> read_path_opt!(:static_dir) |> resolve_path_opt()
    build_dir = opts |> Keyword.get(:build_dir, "build") |> String.trim("/")
    out_dir = Path.join(static_dir, build_dir)
    ssr_out_dir = opts |> read_path_opt!(:ssr_out_dir) |> resolve_path_opt()
    hot_filename = Keyword.get(opts, :hot_filename, "__hot__")
    hot_file = Path.join(static_dir, hot_filename)
    manifest_filename = Keyword.get(opts, :manifest_filename, "manifest.json")
    manifest_file = Path.join(out_dir, manifest_filename)

    {:%{}, [],
     [
       # backend parts
       endpoint: endpoint,

       # frontend parts
       static_dir: static_dir,
       build_dir: build_dir,
       out_dir: out_dir,
       ssr_out_dir: ssr_out_dir,
       hot_file: hot_file,
       manifest_file: manifest_file
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

  defp resolve_path_opt(opt) do
    case opt do
      {app, path} -> Path.join([Application.app_dir(app), path])
      path -> path
    end
  end

  @doc """

  """
  attr :entries, :list, required: true
  attr :config, :map, required: true

  def vite(%{entries: entries, config: config} = assigns) do
    entries = Enum.map(entries, &remove_leading_slash/1)
    assigns = assign(assigns, :entries, entries)

    if running_hot?(config),
      do: vite_on_dev_server(assigns),
      else: vite_on_manifest(assigns)
  end

  @doc """
  Bug: Heex's <script> and <style> can't interpret the components inside them.
  """
  attr :entry, :string, required: true
  attr :config, :map, required: true

  def vite_content(%{entry: entry, config: config} = assigns) do
    entry = remove_leading_slash(entry)
    manifest = config.manifest_file |> File.read!() |> Manifest.parse()
    # throw error if file not found

    chunk = Manifest.fetch_chunk!(manifest, entry)
    # throw error if entry not found

    file = Path.join(config.out_dir, chunk.file)
    # throw error if file not found
    content = File.read!(file)

    assigns = assigns |> assign(:entry, entry) |> assign(:content, content)

    ~CE"""
    {{:safe, @content}}
    """
  end

  @doc """
  Generates script for React refresh runtime.

  Note that the script is generated only when the dev server is running.
  """
  attr :config, :map, required: true
  attr :rest, :global

  def vite_react_refresh(assigns) do
    ~CE"""
    <%= if running_hot?(@config) do %>
      <script type="module" {@rest}>
        import RefreshRuntime from "<%= to_dev_server_url(@config, "@react-refresh") %>";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
      </script>
    <% end %>
    """
  end

  @doc """
  Gets the URL of a chunk.
  """
  def vite_url(key, config) do
    if running_hot?(config) do
      to_dev_server_url(config, key)
    else
      manifest = config.manifest_file |> File.read!() |> Manifest.parse()
      chunk = Manifest.fetch_chunk!(manifest, key)
      to_static_url(config, chunk.file)
    end
  end

  defp remove_leading_slash(path), do: Path.relative(path)

  defp running_hot?(config), do: File.exists?(config.hot_file)

  defp vite_on_dev_server(%{entries: entries, config: _config} = assigns) do
    assigns = assign(assigns, :entries, ["@vite/client" | entries])

    ~CE"""
    <%= for entry <- @entries do %>
      <.tag file={entry} to_url={&to_dev_server_url/2} config={@config} />
    <% end %>
    """
  end

  defp to_dev_server_url(config, entry) do
    base_url = config.hot_file |> File.read!() |> String.trim()
    Path.join([base_url, entry])
  end

  defp vite_on_manifest(%{entries: _entries, config: config} = assigns) do
    manifest = config.manifest_file |> File.read!() |> Manifest.parse()
    assigns = assign(assigns, :manifest, manifest)

    ~CE"""
    <%= for entry <- @entries do %>
      <.entry_tags entry={entry} manifest={@manifest} config={@config} />
    <% end %>
    """
  end

  defp entry_tags(%{entry: entry, manifest: manifest, config: config} = assigns) do
    assigns =
      assign(assigns,
        chunk: Manifest.fetch_chunk!(manifest, entry),
        imported_chunks: Manifest.fetch_imported_chunks!(manifest, entry),
        config: config
      )

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

  defp to_static_url(config, entry) do
    static_url_config = config.endpoint.config(:static_url)

    base_url =
      if static_url_config,
        do: struct(URI, static_url_config) |> URI.to_string(),
        else: "/"

    Path.join([base_url, config.build_dir, entry])
  end

  attr :file, :string, required: true
  attr :to_url, {:fun, 2}, required: true
  attr :config, :map, required: true
  attr :rest, :global

  defp tag(assigns) do
    ~CE"""
    <%= if is_css(@file) do %>
      <link rel="stylesheet" href={apply(@to_url, [@config, @file])} {@rest} />
    <% else %>
      <script type="module" src={apply(@to_url, [@config, @file])} {@rest}>
      </script>
    <% end %>
    """
  end

  defp is_css(entry) do
    Regex.match?(~r/\.(css|less|sass|scss|styl|stylus|pcss|postcss)(\?[^\.]*)?$/, entry)
  end

  # defp cache_manifest(file) do
  #   key = {__MODULE__, file}

  #   case :persistent_term.get(key, nil) do
  #     nil ->
  #       manifest = file |> File.read!() |> Manifest.parse()
  #       :persistent_term.put(key, manifest)
  #       manifest

  #     manifest ->
  #       manifest
  #   end
  # end

  # @doc """
  # Clear the cache of manifest file manually.
  # """
  # def clear_manifest_cache(file) do
  #   :persistent_term.erase({__MODULE__, file})
  # end
end
