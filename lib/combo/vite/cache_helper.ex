defmodule Combo.Vite.CacheHelper do
  @moduledoc false

  def cached_fetch!(key, fun) when is_function(fun, 0) do
    case :persistent_term.get(key, nil) do
      nil ->
        value = fun.()
        :persistent_term.put(key, value)
        value

      value ->
        value
    end
  end
end
