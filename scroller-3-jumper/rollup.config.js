import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'

const config = {
  entry: 'src/my-scroller-jumper.js',
  plugins: [
    resolve(),
    babel()
  ],
  targets: [
    {
      dest: 'dist/jump.js',
      format: 'umd',
      moduleName: 'Jump'
    },
    {
      dest: 'dist/jump.module.js',
      format: 'es'
    }
  ]
};

export default config;