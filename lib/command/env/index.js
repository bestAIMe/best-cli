const path = require('path');
const fs = require('fs');
const shell = require('shelljs');

const logger = require('../../common/logger');

const options = {
  n: {
    alias: 'name',
    describe: '用于生成CDN路径的工程名，默认取package.json中的name字段',
  },
  t: {
    alias: 'title',
    describe:
      '用于在env中生成PROJECT_TITLE字段，默认取package.json中的name字段',
  },
  e: {
    alias: 'environment',
    describe: '环境选择 "koolhaas" or "gateway" ， 默认为: "koolhaas"',
    default: 'koolhaas',
  },
};

const workPath = process.cwd();

const KOOL_GATEWAY_ENVS = {
  test: {
    PROJECT_ENV_PREFIX: 'http://localhost:3000',
  },
  dev: {
    PROJECT_ENV_PREFIX: 'http://localhost:3001',
  },
  pre: {
    PROJECT_ENV_PREFIX: 'http://localhost:3002',
  },
  demo: {
    PROJECT_ENV_PREFIX: 'http://localhost:3003',
  },
  prod: {
    PROJECT_ENV_PREFIX: 'http://localhost:3004',
  },
};

const GATEWAY_ENVS = {
  test: {
    PROJECT_ENV_PREFIX: 'http://localhost:3005',
  },
};

const CDNS = {
  NUWA_CDN: 'http://localhost:3004',
  PROJECT_CDN: 'https://${cdndomain}/${env}/${project}/${version}/',
};

module.exports = {
  options,
  async init(argv) {
    this.setProjectInfo(argv);
    this.generateEnvFiles(argv);
  },
  setProjectInfo(argv) {
    const { n, t } = argv;
    if (!n) {
      const pkgPath = path.resolve(workPath, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        throw new Error(`${pkgPath}不存在.`);
      }
      const pkg = require(pkgPath);
      this.projName = pkg.name;
      this.projTitle = t || pkg.name;
    } else {
      this.projName = n;
      this.projTitle = t;
    }
  },
  generateEnvFiles(argv) {
    const envDirectory = path.resolve(workPath, 'env');
    shell.cd(workPath);

    // 备份原有文件，生成新环境文件
    if (fs.existsSync(envDirectory)) {
      logger.warning(`${envDirectory} 目录即将被覆盖.`);
      shell.exec('rm -rf env.back');
      shell.mv('env', 'env.back');
      shell.rm('-rf', 'env');
      logger.info('Backup env to env.back');
    }

    shell.mkdir('env');

    let environment;
    if (argv.e === 'gateway') {
      environment = GATEWAY_ENVS;
    } else {
      environment = KOOL_GATEWAY_ENVS;
    }

    Object.keys(environment).forEach((env) => {
      const v = environment[env];

      const content = `PROJECT_ENV_PREFIX = ${v.PROJECT_ENV_PREFIX}
PROJECT_TITLE = ${this.projTitle}
PROJECT_CDN = ${CDNS.PROJECT_CDN.replace('${env}', env).replace(
        '${project}',
        this.projName,
      )}
PROJECT_ENV = ${env}
PROJECT_NUWA_CDN = ${CDNS.NUWA_CDN}`;
      const envFilePath = path.resolve(
        path.join(workPath, 'env', `.env.${env}`),
      );
      fs.writeFileSync(envFilePath, content, { encoding: 'UTF-8' });
      logger.success(`Generate ${envFilePath} is succeed.`);
    });
  },
};
