const inquirer = require('inquirer');
const { promisify } = require('util');
const downloadRepo = require('download-git-repo');
const ejs = require('ejs');
const fs = require('fs-extra');
const path = require('path');
const spawn = require('cross-spawn');
const chalk = require('chalk');

const utils = require('../../common/utils');
const downloadGitRepo = promisify(downloadRepo);

class MiniApp {
  constructor(projectName) {
    this.projectName = projectName;
    this.targetPath = null;
    this.baseInfo = {};
    this.requestUrl = null;
  }
  async create() {
    this.handleCreate();
  }
  async handleCreate() {
    this.requestUrl =
      'direct:giturl#master';
    // 1、判断是否有同名应用，设置targetPath
    await this.setIsForceDirectory();
    // 2、 获取项目基本信息
    this.baseInfo = await this.getSubBaseInfo();
    await this.downloadTemplate();
    await this.compilerProject();
    // 进入项目目录自动下载依赖
    this._spawn();
  }

  async setIsForceDirectory() {
    this.targetPath = path.join(process.cwd(), this.projectName);
    if (fs.existsSync(this.targetPath)) {
      const { action } = await inquirer.prompt([
        {
          name: 'action',
          type: 'list',
          message: '同名应用已存在，是否覆盖？',
          choices: [
            {
              name: '覆盖',
              value: 'overwrite',
            },
            {
              name: '取消',
              value: false,
            },
          ],
        },
      ]);
      if (!action) return;
      else {
        await fs.remove(this.targetPath);
      }
    }
  }

  async getSubBaseInfo() {
    // 定义问题对象
    const questions = [
      {
        type: 'input',
        name: 'chineseName',
        message: '请输入项目名称（中文）：',
        validate: function (value) {
          if (!value) {
            return '名称不能为空';
          } else if (fs.existsSync(value)) {
            return '该项目名称已存在，请重新输入';
          } else {
            return true;
          }
        },
      },
      {
        type: 'input',
        name: 'port',
        message: '请输入端口号：',
        default: '7001',
        validate: function (value) {
          const numericValue = Number(value);
          if (
            Number.isNaN(numericValue) ||
            numericValue < 1024 ||
            numericValue > 65535
          ) {
            return '端口号必须是 1024 到 65535 之间的整数';
          } else {
            return true;
          }
        },
      },
    ];

    return new Promise((resolve, reject) => {
      inquirer
        .prompt(questions)
        .then((answers) => {
          // console.log(answers, 'answers');
          const port = Number(answers.port);
          resolve({
            name: this.projectName,
            port,
            chineseName: answers.chineseName,
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  async getMainBaseInfo() {}

  async setPackage() {
    console.log(
      `开始配置应用${chalk.yellowBright(this.projectName)} 的package.json`,
    );
    const pkgPath = path.resolve(this.targetPath, 'pkg.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readFileSync(pkgPath).toString();
      // 读取完文件后直接删除
      fs.unlinkSync(pkgPath);
      return await inquirer.prompt(JSON.parse(pkg));
    }
  }
  async downloadTemplate() {
    await utils.wrapLoading(
      downloadGitRepo,
      '拉取模板中，请稍等 ...',
      this.requestUrl,
      this.targetPath,
      {
        clone: true,
        headers: {
          'PRIVATE-TOKEN': `${gitkey}`,
        },
      },
    );
  }
  async compilerProject() {
    // 1. 设置一些模板信息
    const pkgData = (await this.setPackage()) || {};
    this.packageData = {
      name: this.projectName,
      port: this.baseInfo.port,
      chineseName: this.baseInfo.chineseName,
      ...pkgData,
    };

    const packagePath = path.join(this.targetPath, 'package.json');
    const devPortConfigPath = path.join(this.targetPath, '/config/dev.js');
    const indexPath = path.join(this.targetPath, '/src/index.html');
    // 修改package.json
    if (fs.existsSync(packagePath)) {
      const content = fs.readFileSync(packagePath, 'utf8');
      const result = ejs.compile(content)(this.packageData);
      fs.writeFileSync(packagePath, result);
    }
    // 修改dev port
    if (fs.existsSync(devPortConfigPath)) {
      const content = fs.readFileSync(devPortConfigPath, 'utf8');
      const result = content.replace(/<%=port%>/g, this.packageData.port);
      fs.writeFileSync(devPortConfigPath, result);
    }
    // 修改index.html 标题
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const result = content.replace(
        /<%=chineseName%>/g,
        this.packageData.chineseName,
      );
      fs.writeFileSync(indexPath, result);
    }
  }
  _spawn() {
    console.log(`${chalk.yellowBright('开始安装项目依赖，请稍等...')}`);
    spawn('pnpm', ['install'], {
      cwd: this.targetPath,
      stdio: ['pipe', process.stdout, process.stderr],
    }).on('close', () => {
      console.log(`应用配置完成 ${chalk.yellowBright(this.projectName)}`);
      console.log('请使用以下命令启动项目:');
      console.log(chalk.cyan(`cd ${this.projectName}`));
      console.log(chalk.cyan(`npm run dev`));
    });
  }
}
module.exports = MiniApp;
