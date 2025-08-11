import path, { resolve } from "path";
import webpackNodeExternals from "webpack-node-externals";

export default {
  mode: "production",
  entry: ["./server.js"],
  output: {
    filename: "server.js",
    path: path.resolve("public"),
    library: {
      type: "module",
    },
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: [".js", ".json", ".mjs"], // To support JS, JSON, and modules
    modules: [
      resolve("./src"),
      "server.js",
      "node_modules",
      "./src/oauth-server",
    ],
    //fallback: { url: url },
  },
  externals: [
    webpackNodeExternals(), // Excludes node_modules (useful for server-side apps)
  ],
  node: {
    __dirname: false, // Ensures __dirname works correctly in Node.js
    __filename: false, // Ensures __filename works correctly in Node.js
    //path: true, // Ensures path module is not bundled by Webpack
  },
  //   // Module rules (you can add loaders for JS and other files)
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/, // Apply this rule to .js files
  //       //exclude: /..\/node_modules\//, // Do not transpile node_modules
  //       use: "raw-loader", // This is optional, but you can use `raw-loader` if needed
  //       // use: {
  //       //   loader: "babel-loader", // Optional, if you decide to use Babel in the future
  //       // },
  //     },
  //   ],
  // },
};

// webpack.config.js
// import path from "path";
// import webpackNodeExternals from "webpack-node-externals";

// export default {
//   // Entry point of your Express application (main server file)
//   entry: "./server.js", // Update this to point to your Express app's entry file

//   // Set the mode to 'development' or 'production'
//   mode: "production", // or 'development'

//   // Output configuration
//   output: {
//     path: path.resolve("public"), // The output directory
//     filename: "server.js", // The output file
//     clean: true,
//     libraryTarget: "module", // Ensures compatibility with Node.js
//   },
//   experiments: {
//     outputModule: true, // Enable ECMAScript module output
//   },
//   // Resolve modules
//   resolve: {
//     extensions: [".js", ".json", ".mjs"], // To support JS, JSON, and modules
//     //fallback: { url: url },
//   },

//   // Exclude node_modules from bundling
//   externals: [
//     webpackNodeExternals(), // Excludes node_modules (useful for server-side apps)
//   ],

//   node: {
//     __dirname: false, // Ensures __dirname works correctly in Node.js
//     __filename: false, // Ensures __filename works correctly in Node.js
//     //path: true, // Ensures path module is not bundled by Webpack
//   },

//   // Module rules (you can add loaders for JS and other files)
//   module: {
//     rules: [
//       {
//         test: /\.js$/, // Apply this rule to .js files
//         exclude: /..\/node_modules\//, // Do not transpile node_modules
//         //use: "raw-loader", // This is optional, but you can use `raw-loader` if needed
//         // use: {
//         //   loader: "babel-loader", // Optional, if you decide to use Babel in the future
//         // },
//       },
//     ],
//   },

//   // Enable Source Maps for easier debugging
//   devtool: "source-map",
// };
