import { IsEnum, IsNotEmpty } from 'class-validator';
import { StatutInstrumentBancaire } from '@prisma/client';

export class UpdateStatutInstrumentDto {
  @IsNotEmpty()
  @IsEnum(StatutInstrumentBancaire)
  statutBancaire: StatutInstrumentBancaire;
}
