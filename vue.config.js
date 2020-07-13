module.exports = {
  pluginOptions: {
    express: {
      shouldServeApp: true,
      serverDir: '.'
    },
    webpackBundleAnalyzer: {
      openAnalyzer: false
    },
    gitDescribe: {
      variableName: 'GIT_DESCRIBE'
    }
  }
};
