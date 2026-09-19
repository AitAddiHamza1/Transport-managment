import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceInterventionDto } from './create-maintenance-intervention.dto';

export class UpdateMaintenanceInterventionDto extends PartialType(CreateMaintenanceInterventionDto) {}
