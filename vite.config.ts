/// <reference types="vitest" />
import { resolve } from "path";
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
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
            external: ["react", "react/jsx-runtime", "react-dom", "react-dom/server"],
        },
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [
        react({
            babel: {
                plugins: [
                    ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
                ]
            }
        }),
        dts({ rollupTypes: true })
    ],
    test: {
        environment: 'jsdom',
        include: ['test/**/*.test.ts?(x)'],
    },
})