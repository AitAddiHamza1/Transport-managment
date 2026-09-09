/**
 * Configuration typée, chargée depuis les variables d'environnement.
 * Accessible via ConfigService : config.get('jwt.accessSecret'), etc.
 */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    platformAccessSecret: process.env.PLATFORM_JWT_SECRET,
    platformAccessExpiresIn: process.env.PLATFORM_JWT_EXPIRES_IN ?? '15m',
    platformRefreshSecret: process.env.PLATFORM_JWT_REFRESH_SECRET,
    platformRefreshExpiresIn: process.env.PLATFORM_JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});

