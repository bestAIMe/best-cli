const chalk = require('chalk');

module.exports = {
  info(s) {
    // console.log(chalk.blue(s));
    console.log(s);
  },
  debug(s) {
    console.log(chalk.gray(s));
  },
  success(s) {
    console.log(chalk.green(s));
  },
  warning(s) {
    console.log(chalk.yellow(s));
  },
  error(s) {
    console.log(chalk.red(s));
  },
};
