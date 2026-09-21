export const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';
export const buildSha = import.meta.env.VITE_BUILD_SHA || 'local';
export const buildTime = import.meta.env.VITE_BUILD_TIME || '';
export const appEnvironment = import.meta.env.MODE || 'development';

export const versionLabel = () => {
  const shortSha = buildSha && buildSha !== 'local' ? `+${buildSha.slice(0, 7)}` : '';
  return `v${appVersion}${shortSha}`;
};

export const releaseMetadata = () => ({
  version: appVersion,
  build: buildSha,
  environment: appEnvironment,
  builtAt: buildTime,
});
