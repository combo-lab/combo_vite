# Release Instructions

Releases are managed by [@zekedou](https://github.com/zekedou).

## Release NPM packages

1. `npm install`
2. `npm run test`
3. update `CHANGELOG.md`
4. update the version in `package.json`
5. `npm run build`
6. `npm publish`

## Release Mix packages

1. `mix check`
2. update `CHANGELOG.md`
3. update the version in `mix.exs`
4. `mix publish`
