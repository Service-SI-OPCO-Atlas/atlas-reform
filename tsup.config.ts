import { defineConfig } from 'tsup'

const env = process.env.NODE_ENV

export default defineConfig({
    entry: ['src/index.ts'],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: env === 'release',
    format: ['esm'],
    outExtension() {
        return {
            js: '.js',
        }
    },
})
