const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: './index.html'
});

const NodePolyfillPluginConfig = new NodePolyfillPlugin();

const GenerateWorkboxServiceWorkerPluginConfig = new WorkboxPlugin.GenerateSW({
  // these options encourage the ServiceWorkers to get in there fast
  // and not allow any straggling "old" SWs to hang around
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 33554432
});

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
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
    open: true
  },
  plugins: [
    HtmlWebpackPluginConfig,
    NodePolyfillPluginConfig,
    GenerateWorkboxServiceWorkerPluginConfig
  ],
  experiments: {
    // futureDefaults: true,
    topLevelAwait: true
  }
};
