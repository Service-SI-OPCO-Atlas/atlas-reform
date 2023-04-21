import { defineConfig } from 'tsup'

const env = process.env.NODE_ENV

export default defineConfig({
    entry: ['src/index.ts'],
    dts: true,
    sourcemap: true,
    clean: false, /* cleaning output directory causes issues with yarn link and webpack dev server */
    minify: env === 'release',
    format: [ 'esm' ],
    external: [ 'react', 'react-dom', 'lodash', '@dsid-opcoatlas/yop' ],
    outExtension() {
        return {
            js: '.js',
        }
    },
})
