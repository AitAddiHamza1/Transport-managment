import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryNotificationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  limit?: number = 20;

  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    if (value === undefined || value === null || value === '') return undefined;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  type?: string;
}
