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

class MicroApp {
  constructor(projectName) {
    this.projectName = projectName;
    this.targetPath = null;
    this.baseInfo = {};
    this.requestUrl = null;
  }
  async create() {
    this.handleTemplateType();
  }
  async handleTemplateType() {
    const { projectType } = await inquirer.prompt({
      name: 'projectType',
      type: 'list',
      choices: [
        { value: 'subApp', name: '子应用' },
        { value: 'main', name: '主应用' },
      ],
      message: '请选择模板类型:',
    });
    switch (projectType) {
      case 'subApp':
        this.requestUrl =
          'direct:giturl.git#main';
        // 1、判断是否有同名应用，设置targetPath
        await this.setIsForceDirectory(projectType);
        // 2、 获取项目基本信息
        this.baseInfo = await this.getSubBaseInfo();
        // 3、 下载模版仓库
        await this.downloadTemplate();
        await this.compilerProject();
        // 进入项目目录自动下载依赖
        this._spawn();
        break;
      case 'main':
        this.requestUrl =
          'direct:giturl#main';
        // 1、判断是否有同名应用，设置targetPath
        await this.setIsForceDirectory(projectType);
        // 2、 获取项目基本信息
        // this.baseInfo = await this.getMainBaseInfo();
        // 3、 下载模版仓库
        await this.downloadTemplate();
        await this.compilerMainProject();
        // 进入项目目录自动下载依赖
        this._spawn(true);
        break;
    }
  }

  async setIsForceDirectory(projectType) {
    const isMain = projectType === 'main';
    const cwdSub = isMain ? process.cwd() : `${process.cwd()}/apps`;
    this.targetPath = path.join(cwdSub, this.projectName);
    // console.log(this.targetPath, 'this.targetPath');
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
    const CONFIG_FILE_PATH = path.join(
      process.cwd(),
      'configs',
      'dev-config.json',
    );

    // 读取配置文件内容，并将 JSON 字符串转换为 JavaScript 对象
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));

    // 获取最后一个服务的索引和端口号，并将端口号加 1 作为默认端口号
    const lastServiceIndex = Object.keys(config)?.length - 1;
    const nameSpace =
      config[Object.keys(config)[lastServiceIndex]]?.packageName?.split('/')[0];
    const defaultPort = config[Object.keys(config)[lastServiceIndex]]?.port + 1;
    // console.log(config, 'config');

    // 定义问题对象
    const questions = [
      {
        type: 'input',
        name: 'chineseName',
        message: '请输入子应用名称（中文）：',
        validate: function (value) {
          if (!value) {
            return '名称不能为空';
          } else if (config.hasOwnProperty(value.toLowerCase())) {
            return '该子应用名称已存在，请重新输入';
          } else {
            return true;
          }
        },
      },
      {
        type: 'input',
        name: 'port',
        message: '请输入端口号：',
        default: defaultPort,
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
      // 调用 inquirer.prompt() 方法获取用户输入
      inquirer
        .prompt(questions)
        .then((answers) => {
          //   console.log(answers, 'answers');
          const name = this.projectName;
          const port = Number(answers.port);
          // 将新项写入配置文件
          const newProjectConfig = {
            port,
            name: answers.chineseName,
            packageName: `${nameSpace}/${name}`,
          };
          config[name] = newProjectConfig;
          fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
          //   console.log(
          //     `服务 "${nameSpace}/${name}" 已添加到 dev-config.json 文件中，端口号为 ${port}`
          //   );
          resolve({
            ...newProjectConfig,
            name: answers.name,
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
      `开始配置应用${chalk.yellowBright(
        this.baseInfo.packageName || this.projectName,
      )} 的package.json`,
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
      name: this.baseInfo.packageName,
      chineseName: this.baseInfo.chineseName,
      ...pkgData,
    };

    const packagePath = path.join(this.targetPath, 'package.json');
    const vitePath = path.join(this.targetPath, 'vite.config.ts');
    const indexPath = path.join(this.targetPath, 'index.html');
    // 修改package.json
    if (fs.existsSync(packagePath)) {
      const content = fs.readFileSync(packagePath, 'utf8');
      const result = ejs.compile(content)(this.packageData);
      fs.writeFileSync(packagePath, result);
    }
    // 修改vite port
    if (fs.existsSync(vitePath)) {
      const viteConfigContent = fs.readFileSync(vitePath, 'utf8');
      const newConfigContent = viteConfigContent.replace(
        /port:\s*\d+/,
        `port: ${this.baseInfo.port}`,
      );
      fs.writeFileSync(vitePath, newConfigContent);
    }
    // 修改index.html 标题
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const result = ejs.compile(content)(this.packageData);
      fs.writeFileSync(indexPath, result);
    }
  }
  async compilerMainProject() {
    // 1. 设置一些模板信息
    const pkgData = (await this.setPackage()) || {};

    const packagePath = path.join(this.targetPath, 'package.json');
    // 修改package.json
    if (fs.existsSync(packagePath)) {
      const content = fs.readFileSync(packagePath, 'utf8');
      const result = ejs.compile(content)(pkgData);
      fs.writeFileSync(packagePath, result);
    }
  }
  _spawn(isMain) {
    console.log(`${chalk.yellowBright('开始安装项目依赖，请稍等...')}`);
    spawn('pnpm', ['install'], {
      cwd: this.targetPath,
      stdio: ['pipe', process.stdout, process.stderr],
    }).on('close', () => {
      console.log(`应用配置完成 ${chalk.yellowBright(this.projectName)}`);
      console.log('请使用以下命令启动项目:');
      if (isMain) {
        console.log(chalk.cyan(`cd ${this.projectName}`));
      }
      console.log(chalk.cyan(`npm run start:dev`));
    });
  }
}
module.exports = MicroApp;
