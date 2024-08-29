const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
    entry: './Exports.js',
    output: {
        library: {
            name: 'TargetJ',
            type: 'window'
        },
        environment: {
          arrowFunction: false
        },        
        path: path.resolve(__dirname, '../targetj/jslib'),
        filename: 'targetj.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                include: path.resolve(__dirname, 'src'),          
                use: 'babel-loader',
            }
        ]
    },
    plugins: [
        new ESLintPlugin({
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
