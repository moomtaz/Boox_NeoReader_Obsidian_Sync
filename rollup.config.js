import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  output: {
    dir: '.',
    format: 'cjs',
    sourcemap: 'inline',
    exports: 'default'
  },
  external: ['obsidian'],
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    typescript()
  ]
};
