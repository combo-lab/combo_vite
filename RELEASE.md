# Release Instructions

1. update `CHANGELOG.md`
2. update the version in `mix.exs`
3. update the version in `package.json`
4. run `mix setup`, which syncs `mix.lock` and `pnpm-lock.yaml`
5. run `mix check`
6. run `mix build`
7. run `mix publish`
