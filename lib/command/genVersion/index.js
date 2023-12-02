const fs = require('node:fs');
const path = require('node:path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { SEMVER_REG } = require('../../common/constants');

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`${filePath}不存在.`));
    process.exit(0);
  }
  return new Promise((resolve, rej) => {
    fs.readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        rej(err);
      } else {
        resolve(data);
      }
    });
  });
}

function writeFile(filePath, data) {
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`${filePath}不存在.`));
    process.exit(0);
  }
  fs.writeFile(filePath, data, (err) => {
    if (err) {
      console.log(chalk.red(`修改${filePath}报错 ${err}`));
    }
  });
}

function genVersion() {
  function modifyVersion(v) {
    const vArr = v.split('.'); //切割后的版本号数组
    vArr[2] = parseInt(vArr[2]) + 1;
    const newVerStr = vArr.join('.'); //转换为以"."分割的字符串
    return newVerStr;
  }

  const workPath = process.cwd();
  const pkgPath = path.resolve(workPath, './package.json');
  const originEnvPath = path.resolve(workPath, './env/.env.prod');
  let envPath = originEnvPath;
  // 兼容vue项目
  const oldEnvPath = path.resolve(workPath, './.env.prod');
  if (!fs.existsSync(originEnvPath)) {
    envPath = oldEnvPath;
    if (!fs.existsSync(oldEnvPath)) {
      console.log(chalk.red(`${envPath}不存在.`));
      process.exit(0);
    }
  }
  readFile(pkgPath)
    .then((res) => {
      const pkgJSON = JSON.parse(res);
      if (pkgJSON) {
        let defaultReleaseVersion = modifyVersion(pkgJSON.version);
        execUserInput(defaultReleaseVersion, pkgJSON);
      }
    })
    .catch((e) => {
      console.log(chalk.red(`读取${pkgPath}报错${e}`));
      process.exit(0);
    });

  // 修改env/.env.prod文件的PROJECT_CDN字段
  function modifyEnvCDNStr(envStr, releaseVersion) {
    try {
      const strArr = envStr.split('\n');
      const newStrArr = strArr.map((si) => {
        // 支持VUE_APP_PROJECT_CDN、PROJECT_CDN等
        if (si.search('PROJECT_CDN') !== -1) {
          const cdnArr = si.split('/');
          cdnArr.splice(cdnArr.length - 2, 1, releaseVersion);
          const cdnStr = cdnArr.join('/');
          return cdnStr;
        }
        return si;
      });
      if (Array.isArray(newStrArr) && newStrArr.length) {
        const newEnvData = newStrArr.join('\n');
        writeFile(envPath, newEnvData);
      }
    } catch (e) {
      console.log(chalk.red('读取./env/env.prod文件报错', e));
      process.exit(0);
    }
  }

  // 修改env.prod文件
  function modifyEnvData(releaseVersion) {
    readFile(envPath)
      .then((res) => {
        modifyEnvCDNStr(res, releaseVersion);
      })
      .catch((e) => {
        console.log(chalk.red(e));
        process.exit(0);
      });
  }

  // 获取用户输入
  async function execUserInput(defaultReleaseVersion, pkgJSON) {
    const answer = await inquirer.prompt([
      {
        name: 'version',
        message: '请输入发布版本号，不输入则默认为修订号加1',
        default: defaultReleaseVersion,
        type: 'input',
        validate: function (input) {
          if (!SEMVER_REG.test(input)) {
            return '必须输入符合语义化版本的格式, 例1.2.0';
          }
          return true;
        },
      },
    ]);
    if (answer) {
      const { version } = answer;
      pkgJSON.version = version;
      const delimiter = '\t'; // \t制表符 2: space数量
      writeFile(pkgPath, JSON.stringify(pkgJSON, null, delimiter));
      modifyEnvData(version);
    }
  }
}

module.exports = genVersion;
