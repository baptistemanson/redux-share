/* eslint-disable */

var path = require("path");
var webpack = require("webpack");
var fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });


module.exports = [
{
  entry: {
    "server":"./src/redux-share-server"
  },
  target:'node',
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].bundle.js",
    publicPath: "/dist/",
    // export itself to a global var
    libraryTarget: "umd",
    // name of the global var: "Foo"
    library: "ReduxShareServer"
  },
  externals:nodeModules,
  plugins: [
    new webpack.NoErrorsPlugin(),
  ],
  module: {
    loaders: [
    {
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      loader: "babel-loader"
    }, {
      test: /\.css$/,
      loaders: ["style", "raw"],
      include: __dirname
    }
    ]
  }
}



];
