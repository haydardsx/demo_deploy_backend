export function identity() {
  return {
    instanceId: process.env.INSTANCE_ID || 'local',
    serviceSlot: process.env.SERVICE_SLOT || 'backend-local',
    buildRevision: process.env.BUILD_REVISION || 'development',
  };
}

export function publicVariables() {
  return {
    variables: {
      INSTANCE_ID: identity().instanceId,
      SERVICE_SLOT: identity().serviceSlot,
      BUILD_REVISION: identity().buildRevision,
      DEMO_MESSAGE: process.env.DEMO_MESSAGE || '',
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '3000',
    },
    secrets: Object.fromEntries(['PGPASSWORD', 'DATABASE_URL', 'DEMO_SECRET'].map(
      (key) => [key, Boolean(process.env[key])],
    )),
  };
}

export function corsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:5173').split(',')
    .map((value) => value.trim()).filter(Boolean).map((value) => {
      const url = new URL(value);
      if (url.origin !== value || url.username || url.password ||
          !['https:', 'http:'].includes(url.protocol)) throw new Error('CORS_ORIGINS_INVALID');
      return value;
    });
}
