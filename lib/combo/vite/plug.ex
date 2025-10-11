defmodule Combo.Vite.Plug do
  @moduledoc """
  The plug for preparing the process and the connection.
  """

  @behaviour Plug

  import Combo.Conn, only: [endpoint_module!: 1]
  import Combo.Vite.CacheHelper

  @impl true
  def init(opts) do
    opts
  end

  @impl true
  def call(conn, _opts) do
    endpoint = endpoint_module!(conn)

    key = {__MODULE__, endpoint, :config}
    config = cached_fetch!(key, fn -> build_config(endpoint) end)
    Process.put(:combo_vite_config, config)

    conn
  end

  defp build_config(endpoint) do
    otp_app = endpoint.config(:otp_app)

    config = endpoint.config(:vite, [])
    known_keys = [:static_dir, :build_dir, :hot_filename, :manifest_filename]

    for {key, _value} <- config do
      if key not in known_keys do
        raise ArgumentError, "Unknown Combo.Vite configuration: #{inspect(key)}"
      end
    end

    static_dir = config |> Keyword.get(:static_dir, otp_app) |> resolve_static_dir!()
    build_dir = config |> Keyword.get(:build_dir, "build") |> String.trim("/")
    hot_filename = Keyword.get(config, :hot_filename, "__hot__")
    manifest_filename = Keyword.get(config, :manifest_filename, "manifest.json")

    %{
      endpoint: endpoint,
      static_dir: static_dir,
      build_dir: build_dir,
      hot_filename: hot_filename,
      manifest_filename: manifest_filename
    }
  end

  defp resolve_static_dir!(pattern) do
    case pattern do
      app when is_atom(app) ->
        {app, "priv/static"}

      {_, _} = app_and_path ->
        app_and_path

      _ ->
        raise ArgumentError, """
        the value of [:vite, :static_dir] configuration must be an atom or a tuple\
        """
    end
  end
end
