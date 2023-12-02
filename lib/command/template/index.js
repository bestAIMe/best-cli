const inquirer = require('inquirer');

const config = require('../../common/config');
const logger = require('../../common/logger');
const { QuitOption } = require('../../common/common');
const template = require('./template');
const { exit } = require('process');
const { GIT_REG } = require('../../common/constants');

module.exports = {
  templates: null,
  initTemplates() {
    const cf = config.readConfig();
    this.templates = new Map();

    if (cf.templates && cf.templates.length) {
      cf.templates.forEach((tpl) => {
        this.templates.set(tpl.name, tpl.value);
      });
    }
  },
  writeToConfig() {
    const cf = config.readConfig();
    const templates = [];

    for (let [key, value] of this.templates) {
      templates.push({
        name: key,
        value,
      });
    }

    cf.templates = templates;

    config.writeConfig(cf);
  },
  async select() {
    if (!this.templates) {
      this.initTemplates();
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose your template action:',
        choices: [
          { name: 'Select template', value: 'selectTemplate' },
          { name: 'Add template', value: 'addTemplate' },
          { name: 'Delete template', value: 'deleteTemplate' },
          { name: 'Merge default templates', value: 'mergeTemplate' },
          QuitOption.choice,
        ],
      },
    ]);

    const choice = answers['action'];
    if (choice === 'selectTemplate') {
      await this.selectTemplate();
    } else if (choice === 'addTemplate') {
      await this.addTemplate();
    } else if (choice === 'deleteTemplate') {
      await this.deleteTempldate();
    } else if (choice === 'mergeTemplate') {
      await this.mergeDefaultTemplate();
    } else {
      QuitOption.handler();
    }
  },
  async addTemplate() {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'gitUrl',
        message: 'Template git ssh url:',
        validate: async (input) => {
          const reg = GIT_REG;
          if (input.trim().match(reg)) {
            return true;
          }
          return 'Input correct git ssh url! For example : git@gitlab.huobiapps.com:templates/lib-ts-template.git ';
        },
      },
    ]);

    const gitUrl = answer['gitUrl'];
    const templateName = gitUrl.match(GIT_REG)[1];

    this.templates.set(templateName, gitUrl.trim());

    this.writeToConfig(); //写入配置文件
    template.cloneTemplate(templateName, gitUrl); //下载仓库到目录
    logger.success(`${templateName} is added!`);

    this.select();
  },
  async deleteTempldate() {
    const templateName = await this.getTemplate();

    this.templates.delete(templateName); //从缓存删除
    this.writeToConfig(); //写入配置文件
    template.deteleTemplate(templateName); //删除工程

    this.select();
  },
  async mergeDefaultTemplate() {
    const defaultTemplates = require('./defaultTemplates.json');
    if (!Array.isArray(defaultTemplates)) {
      logger.warning(`Default templates are empty.`);
    } else {
      defaultTemplates.forEach((tpl) => {
        this.templates.set(tpl.name, tpl.value);
      });

      this.writeToConfig();
      logger.success(`Default templates are merged!`);
    }
    this.select();
  },
  async selectTemplate() {
    const templateName = await this.getTemplate();
    await template.generate(templateName, this.templates.get(templateName));
  },
  async getTemplate() {
    const { templates } = this;

    if (!templates.size) {
      logger.warning('Please add a template.');
      await this.select();
      return;
    }

    const choices = [...templates.keys()];
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'tempalteName',
        message: 'Template name:',
        choices: [...choices, QuitOption.choice],
      },
    ]);

    if (answers['tempalteName'] === QuitOption.choice.value) {
      exit(0);
    }

    return answers['tempalteName'];
  },
};
