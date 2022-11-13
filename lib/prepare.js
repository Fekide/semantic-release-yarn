const path = require('path');
const {move} = require('fs-extra');
const execa = require('execa');

module.exports = async (npmrc, {tarballDir, pkgRoot}, {cwd, env, stdout, stderr, nextRelease: {version}, logger}) => {
  const basePath = pkgRoot ? path.resolve(cwd, pkgRoot) : cwd;

  logger.log('Write version %s to package.json in %s', version, basePath);

  const envWithNpmrc = {...env, NPM_CONFIG_USERCONFIG: npmrc};

  const versionResult = execa('yarn', ['version', '--new-version', version, '--no-git-tag-version'], {
    cwd: basePath,
    env: envWithNpmrc,
    preferLocal: true,
  });
  versionResult.stdout.pipe(stdout, {end: false});
  versionResult.stderr.pipe(stderr, {end: false});

  await versionResult;

  if (tarballDir) {
    logger.log('Creating yarn package version %s', version);
    const packResult = execa('yarn', ['pack', '--cwd', basePath], {
      cwd,
      env: envWithNpmrc,
      preferLocal: true,
    });
    packResult.stdout.pipe(stdout, {end: false});
    packResult.stderr.pipe(stderr, {end: false});

    const tarballLine = (await packResult).stdout.split('\n').find((s) => /Wrote tarball to/.test(s));
    const tarballSource = tarballLine.slice(tarballLine.indexOf('"') + 1, tarballLine.lastIndexOf('"'));
    const tarballDestination = path.resolve(cwd, tarballDir.trim(), path.basename(tarballSource));

    // Only move the tarball if we need to
    // Fixes: https://github.com/semantic-release/npm/issues/169
    if (tarballSource !== tarballDestination) {
      await move(tarballSource, tarballDestination);
    }
  }
};
