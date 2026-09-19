import { PartialType } from '@nestjs/swagger';
import { CreateStockEntreeDto } from './create-stock-entree.dto';

export class UpdateStockEntreeDto extends PartialType(CreateStockEntreeDto) {}
