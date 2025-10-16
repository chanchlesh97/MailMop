const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "production",
  entry: {
    popup: path.resolve(__dirname, "popup.js"),
    background: path.resolve(__dirname, "background.js"),
    options: path.resolve(__dirname, "options.js"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  devtool: "source-map",
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "." },
        { from: "popup.html", to: "." },
        { from: "options.html", to: "." },
        { from: "styles.css", to: "." },
        { from: "contentScript.js", to: "." },
        { from: "gmailClient.js", to: "." },
        { from: "icons", to: "icons" },
      ],
    }),
  ],
  optimization: {
    minimize: false,
  },
};
