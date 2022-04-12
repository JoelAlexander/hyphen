const HtmlWebpackPlugin = require('html-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: './index.html'
});

const NodePolyfillPluginConfig = new NodePolyfillPlugin();

module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [ 'babel-loader' ]
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      }
    ]
  },
  mode: 'development',
  devServer: {
    historyApiFallback: true,
    compress: true,
    port: 3030,
    open: true
  },
  plugins: [
    HtmlWebpackPluginConfig,
    NodePolyfillPluginConfig
  ]
};
