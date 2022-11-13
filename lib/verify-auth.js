const execa = require('execa');
const normalizeUrl = require('normalize-url');
const AggregateError = require('aggregate-error');
const getError = require('./get-error');
const getRegistry = require('./get-registry');
const setNpmrcAuth = require('./set-npmrc-auth');

module.exports = async (npmrc, pkg, context) => {
  const {
    cwd,
    env: {DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org/', ...env},
    stdout,
    stderr,
  } = context;
  const registry = getRegistry(pkg, context);

  await setNpmrcAuth(npmrc, registry, context);

  if (normalizeUrl(registry) === normalizeUrl(DEFAULT_NPM_REGISTRY)) {
    try {
      const whoamiResult = execa('npm', ['whoami', '--userconfig', npmrc, '--registry', registry], {
        cwd,
        env,
        preferLocal: true,
      });
      whoamiResult.stdout.pipe(stdout, {end: false});
      whoamiResult.stderr.pipe(stderr, {end: false});
      const result = await whoamiResult;
      // The verdaccio npm registry returns undefined when the token is invalid until version 5
      if (result.stdout === 'undefined') {
        throw new Error('unauthenticated');
      }
    } catch {
      throw new AggregateError([getError('EINVALIDNPMTOKEN', {registry})]);
    }
  }
};
