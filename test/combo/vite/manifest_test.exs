defmodule Combo.Vite.ManifestTest do
  use ExUnit.Case, async: true
  alias Combo.Vite.Manifest

  describe "parse/1" do
    test "handles raw JSON content" do
      json = """
      {
        "src/app.js": {
          "file": "assets/app-BRBmoGS9.js",
          "name": "app",
          "src": "src/app.js",
          "isEntry": true,
          "imports": ["_shared-B7PI925R.js"],
          "css": ["assets/app-5UjPuW-k.css"]
        }
      }
      """

      assert Manifest.parse(json) == %{
               "src/app.js" => %Combo.Vite.Manifest.Chunk{
                 file: "assets/app-BRBmoGS9.js",
                 src: "src/app.js",
                 css: ["assets/app-5UjPuW-k.css"],
                 assets: [],
                 is_entry?: true,
                 name: "app",
                 names: [],
                 is_dynamic_entry?: false,
                 imports: ["_shared-B7PI925R.js"],
                 dynamic_imports: []
               }
             }
    end
  end

  describe "fetch_imported_chunks!/2" do
    test "collects imported chunks in a deep-first way, and skip collected chunks" do
      json =
        """
        {
          "0": {
            "file": "0",
            "imports": ["a", "b", "c", "d"]
          },
          "a": {
            "file": "a",
            "imports": ["a1", "a2"]
          },
          "a1": {
            "file": "a1"
          },
          "a2": {
            "file": "a2"
          },
          "b": {
            "file": "b",
            "imports": ["b1", "b2"]
          },
          "b1": {
            "file": "b1"
          },
          "b2": {
            "file": "b2",
            "imports": ["b3", "c", "b4"]
          },
          "b3": {
            "file": "b3"
          },
          "b4": {
            "file": "b4"
          },
          "c": {
            "file": "c",
            "imports": ["c1", "c2"]
          },
          "c1": {
            "file": "c1"
          },
          "c2": {
            "file": "c2"
          },
          "d": {
            "file": "d",
            "imports": ["d1", "c", "d2"]
          },
          "d1": {
            "file": "d1"
          },
          "d2": {
            "file": "d2"
          }
        }
        """

      manifest = Manifest.parse(json)

      assert [
               %{file: "a1"},
               %{file: "a2"},
               %{file: "a"},
               %{file: "b1"},
               %{file: "b3"},
               %{file: "c1"},
               %{file: "c2"},
               %{file: "c"},
               %{file: "b4"},
               %{file: "b2"},
               %{file: "b"},
               %{file: "d1"},
               %{file: "d2"},
               %{file: "d"}
             ] = Manifest.fetch_imported_chunks!(manifest, "0")
    end
  end
end
