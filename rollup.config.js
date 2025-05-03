import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

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
    typescript()
  ]
};