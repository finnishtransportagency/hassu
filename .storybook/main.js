const path = require("path");
const css_regex = "/\\.css$/";
const css_module_regex = /\.module\.css$/;
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials", "@storybook/addon-postcss"],
  resolve: {
    alias: {
      "@styles": path.resolve(__dirname, "../src/styles/"),
    },
  },
  webpackFinal: async (config, { configType }) => {
    // `configType` has a value of 'DEVELOPMENT' or 'PRODUCTION'
    // You can change the configuration based on that.
    // 'PRODUCTION' is used when building the static version of storybook.

    // Make whatever fine-grained changes you need
    config.resolve.plugins = [
      ...(config.resolve.plugins || []),
      new TsconfigPathsPlugin({
        extensions: config.resolve.extensions,
      }),
    ];

    const cssRule = config.module.rules.find((rule) => rule && rule.test && rule.test.toString() === css_regex);
    cssModuleRule = {
      ...cssRule,
      test: css_module_regex,
      use: cssRule.use.map((rule) => {
        if (rule && rule.loader && rule.loader.match(/[\/\\]css-loader/g)) {
          return {
            ...rule,
            options: {
              ...rule.options,
              modules: {
                localIdentName: "[name]__[local]__[hash:base64:5]",
              },
            },
          };
        }
        return rule;
      }),
    };
    cssRule.exclude = css_module_regex;
    config.module.rules.push(cssModuleRule);

    // Return the altered config
    return config;
  },
};
