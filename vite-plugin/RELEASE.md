# Release Instructions

Releases are managed by [@zekedou](https://github.com/zekedou).

1. Update `CHANGELOG.md`
2. Update the version number in [package.json](./package.json) and commit it
3. `rm -rf node_modules package-lock.json`
4. `npm install`
5. `npm run build`
6. `npm publish`
