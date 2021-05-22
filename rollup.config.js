import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from "rollup-plugin-terser";

/** @type {import('rollup').RollupOptions} */
const config = {
  input: "dist/app.js",
  plugins: [json(), commonjs(), terser()],
  context: 'this',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  },
};

export default config;
