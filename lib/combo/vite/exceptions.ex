defmodule Combo.Vite.URLAccessError do
  defexception [:message]

  @impl true
  def exception({url, status_code: status_code}) do
    message = """
    could not access "#{url}", status_code: #{inspect(status_code)}\
    """

    %__MODULE__{message: message}
  end

  def exception({url, reason: reason}) do
    message = """
    could not access "#{url}", reason: #{inspect(reason)}\
    """

    %__MODULE__{message: message}
  end
end

defmodule Combo.Vite.FileNotFoundError do
  defexception [:message]

  @impl true
  def exception({path, reason}) do
    relative_path = Path.relative_to(path, File.cwd!())

    message = """
    could not read "#{relative_path}", reason: #{inspect(reason)}\
    """

    %__MODULE__{message: message}
  end
end

defmodule Combo.Vite.ChunkNotFoundError do
  defexception [:message]

  @impl true
  def exception(name) do
    message = """
    could not find chunk by given name "#{name}"\
    """

    %__MODULE__{message: message}
  end
end
