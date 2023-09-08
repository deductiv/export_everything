'use strict'
const HtmlWebPackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
// const TerserPlugin = require('terser-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

// let crypto = require('crypto')
// let webpack = require('webpack')
// const merge = require('webpack-merge')
// const baseConfig = require('@splunk/webpack-configs/base.config').default
// const fs = require('fs')
// const configMode = process.env.NODE_ENV || false ? process.env.NODE_ENV : 'development'
// const path2 = path.join(__dirname, `.env.${configMode}`)
// const dotenv = require('dotenv').config({ path: path2 })

Object.defineProperty(exports, '__esModule', {
  value: true
})
const path = require('path')
const appName = process.env.APP_NAME || 'export_everything'
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
const htmlPlugin = new HtmlWebPackPlugin({
  template: './src/public/index.html'
})

exports.create = create
// exports.default = void 0

// Set up an entry config by iterating over the files in the pages directory.
/* const entries = fs
  .readdirSync(path.join(__dirname, 'src'))
  .filter((pageFile) => !/^\./.test(pageFile))
  .reduce((accum, page) => {
    accum[page] = path.join(__dirname, 'src', page.replace(/\.[^.]*$/, ''))
    return accum
  }, {}) */

const entries = {
  development: {
    react: './node_modules/react/umd/react.development.js',
    'react-dom': './node_modules/react-dom/umd/react-dom.development.js'
  },
  production: {
    react: './node_modules/react/umd/react.production.min.js',
    'react-dom': './node_modules/react-dom/umd/react-dom.production.min.js'
  }
}

const DEBUG = process.env.NODE_ENV !== 'production'

function create () {
  /*
  const _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}
  const _ref$babelTypescript = _ref.babelTypescript
  const babelTypescript = _ref$babelTypescript === void 0 ? true : _ref$babelTypescript
  */

  return {
    // __webpack_require__(./node_modules/react/lib/React.js),
    entry: Object.assign(entries[mode], {
      main: './src/index.jsx',
      snackbar_utils: './src/SnackbarUtils.jsx'
    }),
    externalsType: 'umd',
    externals: [
      'react',
      'react-dom'
    ],
    watch: true,
    output: {
      // globalObject: 'this',
      path: path.join(__dirname, '../react'),
      publicPath: `/static/app/${appName}/react/`,
      filename: (pathData) => {
        return ['main', 'react', 'react-dom'].includes(pathData.chunk.name)
          ? '[name].js'
          : '[name].[contenthash:8].js'
      },
      // filename: DEBUG ? '[name].js?[chunkhash]' : '[name].[chunkhash].js',
      chunkFilename: DEBUG ? '[name].[id].js?[chunkhash]' : '[name].[id].[chunkhash].js',
      /* chunkFilename: '[id].[contenthash].js',
      // asyncChunks: true, */
      clean: true,
      library: {
        name: 'main',
        type: 'umd'
      }
    },
    plugins: [
      htmlPlugin,
      DEBUG && new BundleAnalyzerPlugin(),
      !DEBUG && new UglifyJSPlugin()
    ],
    devtool: DEBUG ? 'eval-cheap-module-source-map' : 'source-map',
    mode,
    optimization: {
      // Optimize in production mode only
      mangleExports: !DEBUG,
      minimize: !DEBUG
      /* minimizer: [
        new TerserPlugin({
          minify: TerserPlugin.uglifyJsMinify// , .swcMinify
          // test: /\.js(\?.*)?$/i
        })
      ] */
      /* moduleIds: 'named',
      chunkIds: 'named',
      runtimeChunk: 'single', */
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      fallback: {
        querystring: 'querystring-es3'
      }
    },
    module: {
      rules: [
        {
          parser: {
            amd: false
          },
          include: /lodash/,
          // This is to fix SUI-1212, it does no harm to other scenarios but helps
          // isolating lodash when it's used with dashboard extension
          use: ['imports-loader?define=>false']
        },
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
    }
  }
}

const _default = create()
exports.default = _default
