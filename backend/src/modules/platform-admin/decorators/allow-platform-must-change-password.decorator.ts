import { SetMetadata } from '@nestjs/common';

export const ALLOW_PLATFORM_MUST_CHANGE_PASSWORD_KEY = 'allowPlatformMustChangePassword';
export const AllowPlatformMustChangePassword = () =>
  SetMetadata(ALLOW_PLATFORM_MUST_CHANGE_PASSWORD_KEY, true);
