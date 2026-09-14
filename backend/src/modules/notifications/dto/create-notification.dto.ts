import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  type: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  titre: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  priorite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @IsOptional()
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetRoute?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  dedupKey?: string;

  @IsArray()
  @IsInt({ each: true })
  recipientUserIds: number[];
}
