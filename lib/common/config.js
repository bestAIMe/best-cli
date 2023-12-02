const path = require('path');
const fs = require('fs');
const os = require('os');

const logger = require('./logger');
const encoding = { encoding: 'utf8' };

const homeDir = path.resolve(os.homedir(), '.huobi-client-home');
const configFile = path.join(homeDir, '.config.json');
const temp = path.resolve(homeDir, '.temp');
const templatesDir = path.join(homeDir, 'templates');
const cmdHome = process.cwd();

const defaultTemplates = require('../command/template/defaultTemplates.json');

module.exports = {
  homeDir,
  configFile,
  temp,
  templatesDir,
  cmdHome,
  check() {
    if (fs.existsSync(homeDir) && fs.existsSync(this.configFile)) {
      return;
    }
  },
  initConfig() {
    const cf = this.configFile;

    // 配置文件目录
    if (!fs.existsSync(homeDir)) {
      fs.mkdirSync(homeDir);
    }

    // 临时文件目录
    if (!fs.existsSync(temp)) {
      fs.mkdirSync(temp);
    }

    // 配置文件目录
    if (!fs.existsSync(this.configFile)) {
      logger.success(`Create ${this.configFile} is succeed`);
      fs.writeFileSync(
        cf,
        JSON.stringify({ templates: defaultTemplates }),
        encoding,
      );
    }

    //模板目录
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir);
    }
  },
  readConfig() {
    const content = fs.readFileSync(this.configFile, encoding);
    return JSON.parse(content);
  },
  writeConfig(config) {
    fs.writeFileSync(
      this.configFile,
      JSON.stringify(config, null, '\t'),
      encoding,
    );
  },
};
