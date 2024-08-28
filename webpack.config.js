const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
    entry: './Exports.js',
    output: {
        library: {
            name: 'TargetJ',
            type: 'window'
        },
        path: path.resolve(__dirname, './dist'),
        filename: 'targetj.js'
    },
    plugins: [
        new ESLintPlugin({
            extensions: ['js'],
            exclude: 'node_modules',
            overrideConfig: {
                env: {
                    browser: true,
                    es2021: true
                },
                extends: [
                    'eslint:recommended'
                ],
                parserOptions: {
                    ecmaVersion: 12,
                    sourceType: 'module'
                },
                rules: {
                    'curly': 'error',
                    'eqeqeq': 'error',
                    'dot-notation': 'off',
                    'no-console': 'warn',
                    'no-loop-func': 'off'
                }
            }
        })
    ],
    resolve: {
        extensions: ['.js']
    }
};
