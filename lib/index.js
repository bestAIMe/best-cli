#!/usr/bin/env node
const yargs = require('yargs');

const argv = process.argv.slice(2);
const cli = yargs();

const env = require('./command/env');

const config = require('./common/config');
const MicroApp = require('./command/microApp');
const MiniApp = require('./command/miniApp');

const genVersion = require('./command/genVersion');

const app = {
  async init() {
    if (!config.check()) {
      config.initConfig();
    }

    cli
      .command({
        command: 'template',
        describe: 'Init template.',
        handler: async (argv) => {
          await require('./command/template').select();
        },
      })
      .command({
        command: 'env',
        describe: 'Init env files.',
        builder: (yargs) => {
          return yargs.options(env.options);
        },
        handler: async (argv) => {
          await env.init(argv);
        },
      })
      .command({
        command: 'microApp <project-name>',
        describe: 'create a new microApp project',
        handler: async (argv) => {
          const myApp = new MicroApp(argv.projectName);
          myApp.create();
        },
      })
      .command({
        command: 'miniApp <project-name>',
        describe: 'create a new miniApp project',
        handler: async (argv) => {
          const myApp = new MiniApp(argv.projectName);
          myApp.create();
        },
      })
      .command({
        command: 'genVersion',
        describe: '生成发布版本号，修改cdn地址',
        handler: genVersion,
      })
      .parse(argv);
  },
};

app.init();
