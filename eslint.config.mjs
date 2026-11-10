import js from '@eslint/js'
import ts from 'typescript-eslint'
import jsoncPlugin from 'eslint-plugin-jsonc'
import globals from 'globals'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { includeIgnoreFile } from '@eslint/compat'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default ts.config([
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),

  js.configs.recommended,
  prettierRecommended,
  ...jsoncPlugin.configs['flat/prettier'],

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },

  {
    files: ['**/*.ts'],
    extends: ts.configs.recommended,
  },
])
