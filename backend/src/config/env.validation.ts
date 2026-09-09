import * as Joi from 'joi';

/**
 * Schéma de validation des variables d'environnement.
 * L'application refuse de démarrer si une variable requise est absente/invalide.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  SWAGGER_PATH: Joi.string().default('docs'),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_ACCESS_SECRET: Joi.string().min(8).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  PLATFORM_JWT_SECRET: Joi.string().min(8).required(),
  PLATFORM_JWT_EXPIRES_IN: Joi.string().default('15m'),
  PLATFORM_JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  PLATFORM_JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGIN: Joi.string().default('*'),
}).custom((value, helpers) => {
  const secrets = [
    value.JWT_ACCESS_SECRET,
    value.JWT_REFRESH_SECRET,
    value.PLATFORM_JWT_SECRET,
    value.PLATFORM_JWT_REFRESH_SECRET,
  ].filter(Boolean);
  const uniqueSecrets = new Set(secrets);
  if (uniqueSecrets.size !== secrets.length) {
    return helpers.error('any.custom', {
      message:
        'All 4 JWT secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PLATFORM_JWT_SECRET, PLATFORM_JWT_REFRESH_SECRET) must be strictly unique and distinct.',
    });
  }
  return value;
});

