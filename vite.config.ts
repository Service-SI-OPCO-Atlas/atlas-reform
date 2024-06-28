/// <reference types="vitest" />
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts"

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "./src/index.ts"),
            name: "@dsid-opcoatlas/reform",
            fileName: (format) => `index.${format}.js`,
            formats: ["es"],
        },
        rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime", "lodash-es"],
        },
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [dts({ rollupTypes: true })],
    test: {
        environment: 'jsdom',
        include: ['test/**/*.test.ts?(x)'],
    },
})