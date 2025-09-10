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
      extra_applications: [:logger, :inets]
    ]
  end

  defp deps do
    [
      {:combo, "~> 0.2"},
      {:ex_check, ">= 0.0.0", only: [:dev], runtime: false},
      {:credo, ">= 0.0.0", only: [:dev], runtime: false},
      {:dialyxir, ">= 0.0.0", only: [:dev], runtime: false},
      {:ex_doc, ">= 0.0.0", only: [:dev], runtime: false},
      {:makeup_elixir, "~> 1.0.1", only: [:dev], runtime: false},
      {:makeup_ceex, "~> 0.1.0", only: [:dev], runtime: false},
      {:makeup_syntect, "~> 0.1.0", only: [:dev], runtime: false}
    ]
  end
end
