import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'

const config = {
  entry: 'src/my-iscroll.js',
  plugins: [
    resolve(),
    babel()
  ],
  targets: [
    {
      dest: 'dist/iscroll.js',
      format: 'umd',
      moduleName: 'Iscroll'
    },
    {
      dest: 'dist/iscroll.module.js',
      format: 'es'
    }
  ]
};

export default config;