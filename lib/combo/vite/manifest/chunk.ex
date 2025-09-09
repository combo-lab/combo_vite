defmodule Combo.Vite.Manifest.Chunk do
  @moduledoc false

  # The struct is implemented by following
  # https://github.com/vitejs/vite/blob/v7.0/packages/vite/src/node/plugins/manifest.ts
  # at 2025-09-09

  @type t :: %__MODULE__{
          file: String.t(),
          src: String.t() | nil,
          css: [String.t()],
          assets: [String.t()],
          is_entry?: boolean(),
          name: String.t() | nil,
          names: [String.t()],
          is_dynamic_entry?: boolean(),
          imports: [String.t()],
          dynamic_imports: [String.t()]
        }

  defstruct [
    :file,
    src: nil,
    css: [],
    assets: [],
    is_entry?: false,
    name: nil,
    names: [],
    is_dynamic_entry?: false,
    imports: [],
    dynamic_imports: []
  ]
end
