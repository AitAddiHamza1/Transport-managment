import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDocumentVehiculeDto } from './create-document-vehicule.dto';

export class UpdateDocumentVehiculeDto extends PartialType(
  OmitType(CreateDocumentVehiculeDto, ['immatriculation'] as const),
) {}
