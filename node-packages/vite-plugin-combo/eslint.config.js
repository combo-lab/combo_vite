import { defineConfig } from "eslint/config"
import globals from "globals"
import tsParser from "@typescript-eslint/parser"

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
    },
  },
])
