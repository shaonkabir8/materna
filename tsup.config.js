import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js', 'src/cli.js'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  splitting: false,
  treeshake: true,
});
