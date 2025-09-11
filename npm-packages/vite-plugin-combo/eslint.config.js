import { defineConfig } from "eslint/config"
import globals from "globals"
import tsParser from "@typescript-eslint/parser"
import stylistic from "@stylistic/eslint-plugin"

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
    },
  },
  stylistic.configs.customize({
    braceStyle: '1tbs',
  }),
])
