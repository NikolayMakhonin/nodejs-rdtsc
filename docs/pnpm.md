# About

1) `.pnpm-store` should be in the same drive for create hard links to files. Just don't change default settings.
2) `node_modules/.pnpm` contains hard links to the `.pnpm-store` files
3) to check the hard links use this command: `fsutil hardlink list [file-name]`

see also [this discussion](https://github.com/pnpm/pnpm/issues/2124)
