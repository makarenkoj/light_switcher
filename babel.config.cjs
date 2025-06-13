module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: false, }],
  ],
  plugins: [
    'babel-plugin-transform-import-meta',
  ],
  overrides: [
    {
      test: /node_modules\/(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)\//,
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs',
        }],
      ],
    },
  ],
};
