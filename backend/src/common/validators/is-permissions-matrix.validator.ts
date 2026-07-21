import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { MODULES, PERMISSION_ACTIONS } from '../permissions/permissions';

const VALID_MODULE_KEYS = new Set(MODULES.map((m) => m.key));
const VALID_ACTION_KEYS = new Set<string>(PERMISSION_ACTIONS);

/**
 * Valideur strict class-validator pour les matrices de permissions dans les DTOs.
 * Rejette les modules inconnus, les actions inconnues, les valeurs non-booléennes et les structures malformées.
 */
export function IsPermissionsMatrix(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPermissionsMatrix',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validate(value: any, _args: ValidationArguments) {
          if (value === undefined || value === null) return true; // Les champs optionnels sont gérés par @IsOptional()
          if (typeof value !== 'object' || Array.isArray(value)) return false;

          for (const [moduleKey, actionsObj] of Object.entries(value)) {
            // Module inconnu ? Rejet.
            if (!VALID_MODULE_KEYS.has(moduleKey)) return false;

            if (
              actionsObj === null ||
              typeof actionsObj !== 'object' ||
              Array.isArray(actionsObj)
            ) {
              return false;
            }

            for (const [actionKey, actionVal] of Object.entries(
              actionsObj as Record<string, unknown>,
            )) {
              // Action inconnue ? Rejet.
              if (!VALID_ACTION_KEYS.has(actionKey)) return false;

              // Valeur non booléenne ? Rejet strict.
              if (typeof actionVal !== 'boolean') return false;
            }
          }

          return true;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        defaultMessage(_args: ValidationArguments) {
          return 'La matrice de permissions contient un module, une action ou une valeur non booléenne invalide';
        },
      },
    });
  };
}
