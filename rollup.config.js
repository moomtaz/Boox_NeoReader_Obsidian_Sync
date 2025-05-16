//rollup.config.js
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import postcss from "rollup-plugin-postcss"; // 🔥 This is the key plugin

export default {
  input: "src/main.ts",
  output: {
    dir: ".",
    format: "cjs",
    sourcemap: true,
    exports: "default"
  },
  external: ["obsidian"],
  plugins: [
    nodeResolve({ browser: true }),
    typescript(),
    postcss() // ✅ Comma was missing above
  ]
};