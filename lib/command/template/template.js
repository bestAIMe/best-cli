const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const shell = require('shelljs');
const { exit } = require('process');
const chalk = require('chalk');

const config = require('../../common/config');
const logger = require('../../common/logger');
const pkgNameReg = /^(@best|@maple)\/.+$/;

const { templatesDir } = config;
const silent = { silent: true };

module.exports = {
  async generate(templateName, gitUrl) {
    this.templateName = templateName;
    this.gitUrl = gitUrl;
    this.info = {
      sourceGitUrl: gitUrl,
      templatePath: path.join(templatesDir, this.templateName),
      templateName,
    };

    if (!fs.existsSync(this.info.templatePath)) {
      shell.cd(config.templatesDir);
      shell.exec(`git clone ${gitUrl}`);
    } else {
      //拉取最新代码
      shell.cd(this.info.templatePath);
      shell.exec('git pull', silent);
    }

    try {
      await this.getProjectName();
      await this.getBranches();
      await this.getOtherInfo();

      logger.info(this.info);

      await this.generateFiles();

      logger.success(`Create ${this.info.projectName} is finished!`);
    } catch (error) {
      logger.error(error.stack);
    }
  },
  async getProjectName() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        validate: async (input) => {
          if (!input || !input.match(/^[a-zA-Z0-9_-]+$/)) {
            return 'Please input a right name.';
          }
          return true;
        },
      },
    ]);

    const projectHome = path.join(config.cmdHome, answers.projectName);
    const projectName = answers['projectName'];

    if (fs.existsSync(projectHome)) {
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'isOverwrite',
          default: false,
          message: chalk.yellow(
            `Project 【${projectName}】 is existed!Do your want overwrite?`,
          ),
        },
      ]);

      if (!confirm.isOverwrite) {
        await this.getProjectName();
      } else {
        shell.cd(config.cmdHome);
        shell.rm('-rf', projectName);
      }
    }

    this.info.projectName = projectName;
    this.info.projectHome = projectHome;
  },

  async getBranches() {
    shell.cd(this.info.templatePath);

    const { stdout } = shell.exec('git branch -a', silent);
    const branches = [];

    if (stdout) {
      stdout.split(/\n/).forEach((b) => {
        // 只选取feature/命名的分支
        const matches = b.match(/(feature\/.+$)/);
        if (
          matches &&
          matches[1] &&
          branches.indexOf(matches[1]) &&
          branches.indexOf(matches[1]) === -1
        ) {
          branches.push(matches[1]);
        }
      });
    } else {
      exit(0);
    }

    if (branches && branches.length > 1) {
      //分支大于1时选分支
      const anwsers = await inquirer.prompt([
        {
          type: 'list',
          name: 'branch',
          message: 'Template branch:',
          choices: branches,
        },
      ]);

      this.info.branch = anwsers['branch'];
    } else {
      this.info.branch = branches[0];
    }
  },
  async getOtherInfo() {
    const name = shell.exec('git config user.name', silent);
    const email = shell.exec('git config user.email', silent);
    const author = `${name.trim()} <${email.trim()}>`;

    const anwsers = await inquirer.prompt([
      {
        type: 'input',
        name: 'version',
        message: 'Project version:',
        default: '1.0.0',
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: author,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
      },
      {
        type: 'confirm',
        name: 'isInstallNpm',
        message: 'Install NPM:',
      },
    ]);

    this.info = Object.assign(this.info, anwsers);
  },
  async generateFiles() {
    const { info } = this;

    shell.cd(info.templatePath);
    shell.exec(`git checkout ${info.branch}`);
    //确认代码是最新的
    shell.exec(`git pull origin ${info.branch}`);

    // 文件拷贝
    shell.cd(config.cmdHome);
    shell.cp('-R', info.templatePath, info.projectHome);
    shell.cd(info.projectHome);
    shell.rm('-rf', '.git');
    shell.rm('-rf', '.github');
    shell.exec('git init');

    // 修改package.json内容
    const encoding = { encoding: 'utf8' };
    const pkgInfoPath = path.join(info.projectHome, 'package.json');

    if (fs.existsSync(pkgInfoPath)) {
      const pkgInfo = JSON.parse(fs.readFileSync(pkgInfoPath, encoding));
      if (pkgInfo.name.match(pkgNameReg)) {
        pkgInfo.name = pkgInfo.name.replace(
          /^(@best|@maple)\/.+$/,
          `$1/${info.projectName}`,
        );
      } else {
        pkgInfo.name = info.projectName;
      }

      pkgInfo.author = info.author;
      pkgInfo.version = info.version;
      pkgInfo.description = info.description;

      fs.writeFileSync(
        pkgInfoPath,
        JSON.stringify(pkgInfo, null, '\t'),
        encoding,
      );

      if (info.isInstallNpm) {
        shell.cd(info.projectHome);
        shell.exec('npm install');
      }
    }
  },
  cloneTemplate(templateName, url) {
    //进入临时目录
    shell.cd(templatesDir);
    shell.exec(`git clone ${url} --progress`);
    logger.info(`Clone ${url} end.`);
  },
  deteleTemplate(templateName, url) {
    //进入临时目录
    shell.cd(templatesDir);
    shell.rm('-rf', templateName);
    logger.info(`Remove directory ${templateName} end.`);
  },
};
