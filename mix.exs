defmodule Combo.Vite.MixProject do
  use Mix.Project

  @version "0.8.0"
  @description "Provides Vite integration for Combo."
  @source_url "https://github.com/combo-lab/combo_vite"
  @changelog_url "https://github.com/combo-lab/combo_vite/blob/v#{@version}/CHANGELOG.md"

  def project do
    [
      app: :combo_vite,
      version: @version,
      elixir: "~> 1.18",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      description: @description,
      source_url: @source_url,
      homepage_url: @source_url,
      docs: docs(),
      package: package(),
      aliases: aliases()
    ]
  end

  def application do
    [
      extra_applications: [:logger, :inets]
    ]
  end

  defp deps do
    [
      {:combo, "~> 0.5"},
      {:ex_check, ">= 0.0.0", only: [:dev], runtime: false},
      {:credo, ">= 0.0.0", only: [:dev], runtime: false},
      {:dialyxir, ">= 0.0.0", only: [:dev], runtime: false},
      {:ex_doc, ">= 0.0.0", only: [:dev], runtime: false},
      {:makeup_elixir, "~> 1.0.1", only: [:dev], runtime: false},
      {:makeup_ceex, "~> 0.1.0", only: [:dev], runtime: false},
      {:makeup_syntect, "~> 0.1.0", only: [:dev], runtime: false}
    ]
  end

  defp docs do
    [
      extras: ["README.md", "USER_GUIDE.md", "CHANGELOG.md", "LICENSE"],
      main: "readme",
      source_url: @source_url,
      source_ref: "v#{@version}"
    ]
  end

  defp package do
    [
      licenses: ["MIT"],
      links: %{
        Source: @source_url,
        Changelog: @changelog_url
      },
      files: ~w(
        lib mix.exs README.md LICENSE

        node-packages/vite-plugin-combo/package.json
        node-packages/vite-plugin-combo/dist/
        node-packages/vite-plugin-combo/README.md
        node-packages/vite-plugin-combo/LICENSE
      )
    ]
  end

  defp aliases do
    [
      setup: [
        "deps.get",
        "node-packages.deps.get"
      ],
      "node-packages.deps.get": [
        "cmd --cd node-packages/vite-plugin-combo pnpm install"
      ],
      "node-packages.build": [
        "cmd --cd node-packages/vite-plugin-combo pnpm run lint",
        "cmd --cd node-packages/vite-plugin-combo pnpm run test",
        "cmd --cd node-packages/vite-plugin-combo pnpm run build"
      ],
      build: ["compile", "node-packages.build"],
      publish: ["hex.publish", "tag"],
      tag: &tag_release/1
    ]
  end

  defp tag_release(_) do
    Mix.shell().info("Tagging release as v#{@version}")
    System.cmd("git", ["tag", "v#{@version}", "--message", "Release v#{@version}"])
    System.cmd("git", ["push", "--tags"])
  end
end
