const md5File = require('md5-file');

module.exports = {
  getUUID() {
    return (
      '0000' + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)
    ).slice(-6);
  },
  getFileMD5(filepath) {
    return md5File.sync(filepath);
  },
  applyIf(o, t) {
    Object.keys(o).forEach((key) => {
      if (typeof t[key] === 'undefined') {
        t[key] = o[key];
      }
    });
  },
  trimSlash(s) {
    return `${s}`.replace(/^\/|\/$/, '');
  },
  getCDNArray(json) {
    if (json) {
      return Object.keys(json).map((key) => json[key].CDN_URL);
    } else {
      return [];
    }
  },
  sleep(timer) {
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        resolve();
      }, timer);
    });
  },
  async wrapLoading(fn, message, ...args) {
    const ora = await import('ora').then((module) => module.default);
    return new Promise(async (resolve, reject) => {
      const spinner = ora(message);
      try {
        spinner.start();
        const data = await fn(...args);
        spinner.stop();
        resolve(data);
      } catch (e) {
        spinner.fail('fetch failed, refetching ...');
        await sleep(2000);
        wrapLoading(fn, message, ...args);
      }
    });
  },
};
