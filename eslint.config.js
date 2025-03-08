import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      sourceType: "module",
      globals: globals.node,
    },
    ignores: [
      "node_modules/", // Ignore node_modules folder
      "build/", // Ignore build folder
      "public/", // Ignore dist folder
      "src/oauth-server/assets", // Ignore static public folder
    ],
  },
  pluginJs.configs.recommended,
];
