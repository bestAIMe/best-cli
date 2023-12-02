const { exit } = require('process');
const chalk = require('chalk');

exports.QuitOption = {
  handler() {
    exit(0);
  },
  choice: { name: chalk.gray('Quit'), value: 'quit' },
};
