import { terser } from "rollup-plugin-terser";

/** @type {import('rollup').RollupOptions} */
const config = {
  input: "dist/app.js",
  plugins: [terser()],
  context: 'this',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  },
};

export default config;
