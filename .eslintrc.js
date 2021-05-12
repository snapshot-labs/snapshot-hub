module.exports = {
  root: true,
  env: {
    node: true,
    es6: true
  },
  plugins: [
    'prettier',
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    'parser': 'babel-eslint',
    'ecmaVersion': 2020,
    'sourceType': 'module'
  },
  rules: {
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-undef': 'off',
    'prettier/prettier': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off'
  },
  globals: {
    'fetch': false
  }
};
