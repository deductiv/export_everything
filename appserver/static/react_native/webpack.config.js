'use strict'
const { merge } = require('webpack-merge')
const baseConfig = require('@splunk/webpack-configs').default

const HtmlWebPackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const path = require('path')
const appName = process.env.APP_NAME || 'export_everything'
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
const htmlPlugin = new HtmlWebPackPlugin({
  template: './src/public/index.html'
})

// const DEBUG = process.env.NODE_ENV !== 'production'
module.exports = merge(baseConfig, {
  mode,
  entry: './src/index.jsx',
  output: {
    path: path.join(__dirname, '../dist'),
    publicPath: `/static/app/${appName}/dist/`,
    filename: (pathData) => {
      return ['main'].includes(pathData.chunk.name)
        ? '[name].js'
        : '[name].[contenthash:8].js'
    },
    clean: true
  },
  plugins: [
    mode === 'development' && htmlPlugin,
    mode === 'production' && new UglifyJSPlugin(),
    mode === 'production' && new BundleAnalyzerPlugin()
  ],
  optimization: {
    // Optimize in production mode only
    mangleExports: mode === 'production',
    minimize: mode === 'production'
  },
  module: {
    rules: [
      { test: /\.(js|mjs|jsx|ts|tsx)$/, exclude: /node_modules/, use: ['babel-loader'] },
      { test: /\.scss?$/, exclude: /node_modules/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css?$/, use: ['style-loader', 'css-loader'] },
      { test: /\.txt$/, use: ['raw-loader'] },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[hash].[ext]',
              limit: 100000
            }
          }
        ]
      },
      {
        test: /\.(eot|ttf|wav|mp3)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[hash].[ext]'
            }
          }
        ]
      }
    ]
  }
})

// const _default = create()
// exports.default = _default

// function create () {
/*
  const _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}
  const _ref$babelTypescript = _ref.babelTypescript
  const babelTypescript = _ref$babelTypescript === void 0 ? true : _ref$babelTypescript
  */

/* return {
    mode,
    entry: {
      // ...entries[mode],
      main: './src/index.jsx' // { import: './src/index.jsx' } //, dependOn: ['react', 'react-dom'] }
    },
    externalsType: 'umd',
    externals: [
      'react',
      'react-dom'
    ],
    { Object.assign(entries[mode], {
      main: './src/index.jsx'
    }),
    output: {
      path: path.join(__dirname, '../dist'),
      publicPath: `/static/app/${appName}/dist/`,
      filename: (pathData) => {
        return ['main', 'react', 'react-dom'].includes(pathData.chunk.name)
          ? '[name].js'
          : '[name].[contenthash:8].js'
      },
      clean: true,
      chunkFilename: DEBUG ? '[name].[id].js?[chunkhash]' : '[name].[id].[chunkhash].js',
      libraryTarget: 'amd',
      library: {
        name: 'main',
        type: 'umd'
      }
    },
    devtool: DEBUG ? 'eval-cheap-module-source-map' : 'source-map',
    plugins: [
      htmlPlugin,
      !DEBUG && new BundleAnalyzerPlugin(),
      !DEBUG && new UglifyJSPlugin()
    ],
    optimization: {
      // Optimize in production mode only
      mangleExports: !DEBUG,
      minimize: !DEBUG
      runtimeChunk: 'single',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      fallback: {
        querystring: 'querystring-es3'
      }
    },
    module: {
      rules: [
        { test: /\.(js|mjs|jsx|ts|tsx)$/, exclude: /node_modules/, use: ['babel-loader'] },
        { test: /\.scss?$/, exclude: /node_modules/, use: ['style-loader', 'css-loader', 'sass-loader'] },
        { test: /\.css?$/, use: ['style-loader', 'css-loader'] },
        { test: /\.txt$/, use: ['raw-loader'] },
        {
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                name: '[hash].[ext]',
                limit: 100000
              }
            }
          ]
        },
        {
          test: /\.(eot|ttf|wav|mp3)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[hash].[ext]'
              }
            }
          ]
        }
      ]
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'public')
      },
      compress: true,
      port: 8080
    } */
