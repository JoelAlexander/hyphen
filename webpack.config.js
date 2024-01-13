const path = require('path')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: './index.html'
})

const NodePolyfillPluginConfig = new NodePolyfillPlugin()

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        include: path.resolve(__dirname, 'src/index.js'),
        use: [
          {
            loader: path.resolve(__dirname, 'manifest-loader.js')
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [ 'babel-loader' ]
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.html$/i,
        loader: 'html-loader',
      },

    ]
  },
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    historyApiFallback: true,
    compress: true,
    port: 3030,
    open: true,
    setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
            throw new Error('webpack-dev-server is not defined');
        }

        devServer.app.get('/chain-config', function(req, res) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.json(JSON.parse(fs.readFileSync(path.join(__dirname, 'chain-config.json'), 'utf8')));
        });

        return middlewares;
    },
  },
  plugins: [
    HtmlWebpackPluginConfig,
    NodePolyfillPluginConfig
  ],
  experiments: {
    // futureDefaults: true,
    topLevelAwait: true
  },
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom'
    }
  }
}
