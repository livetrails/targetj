 const path = require('path');

module.exports = {
  entry: './Exports.js',
  output: {
    library: {
      name: 'TargetJ',
      type: 'window'
    },
    path: path.resolve(__dirname, '../targetj/jslib'),
    filename: 'targetj.js'
  }
};