module.exports = {
  GIT_REG:
    /^(?:https:\/\/)*?hd-ops-gitlab\.test\.geely\.com(?::|\/)(?:[^\/]+\/)+([^\/]+)\.git$/,
  PUBLISH_TAG_REG: /^PRD_T[0-9]+(?:_\d+)?$/,
  ENV: {
    TEST: 'TEST',
    PRD: 'PRD',
    PRE_PRD: 'PRE_PRD',
  },
  SEMVER_REG:
    /(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<preRelease>(?:[a-zA-Z1-9][a-zA-Z\d]*|0\d*[a-zA-Z][a-zA-Z\d]*|0)(?:\.(?:[a-zA-Z1-9][a-zA-Z\d]*|0\d*[a-zA-Z][a-zA-Z\d]*|0))*))?(?:\+(?<metadata>(?:[a-zA-Z\d-]*)(?:\.(?:[a-zA-Z\d-]*))*))?/,
};
