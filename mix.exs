defmodule Combo.Vite.MixProject do
  use Mix.Project

  def project do
    [
      app: :combo_vite,
      version: "0.1.0",
      elixir: "~> 1.18",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:combo, "~> 0.1"}
    ]
  end
end
