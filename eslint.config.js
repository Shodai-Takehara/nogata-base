// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // ビルド前スクリプトは Node で動くため、RN 向け設定に Node のグローバルを足す
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: require('globals').node,
    },
  },
  {
    rules: {
      // 外部モジュール → エイリアス(@/) → 相対 の順に、グループ間は空行で区切る。
      // 整形は Prettier、並び順はこのルールが持つ(pre-commit で --fix される前提)
      'import/order': [
        'error',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
