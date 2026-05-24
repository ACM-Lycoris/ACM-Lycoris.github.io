const crypto = require('node:crypto');

const nunjucks = require('nunjucks');
const helper = require('think-helper');

const { GRAVATAR_STR } = process.env;

const env = new nunjucks.Environment();

env.addFilter('md5', (str) => helper.md5(str));
env.addFilter('sha256', (str) => crypto.createHash('sha256').update(str).digest('hex'));

const DEFAULT_GRAVATAR_STR = '';

module.exports = class extends think.Service {
  async stringify(comment) {
    const fn = think.config('avatarUrl');

    if (think.isFunction(fn)) {
      const ret = await fn(comment);

      if (think.isString(ret) && ret) {
        return ret;
      }
    }

    const gravatarStr = GRAVATAR_STR || DEFAULT_GRAVATAR_STR;

    return env.renderString(gravatarStr, comment);
  }
};
