const path = require('path');
module.exports = {
   entry: './src/index.ts',
   output: {
       filename: 'main.min.js',
       path: path.resolve(__dirname, 'dist/web'),
       libraryTarget: 'window',
   },
   resolve: {
       extensions: ['.ts', '.js'],
   },
   module: {
       rules: [{ test: /\.ts$/, loader: 'ts-loader' }],
   },
   devtool: 'source-map',
}