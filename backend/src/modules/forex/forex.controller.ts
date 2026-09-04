import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { ForexService } from './forex.service';

@ApiTags('Forex / Taux de change')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('forex')
export class ForexController {
  constructor(private readonly forexService: ForexService) {}

  @Get('rate')
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Obtenir le taux de change EUR → MAD de Bank Al-Maghrib' })
  @ApiResponse({ status: 200, description: 'Taux de change récupéré avec succès' })
  @ApiResponse({ status: 503, description: 'Service de taux de change indisponible' })
  async getRate(@Query('date') date?: string) {
    const result = await this.forexService.getEurToMadRate(date);
    return {
      from: 'EUR',
      to: 'MAD',
      rate: Number(result.rate),
      date: result.date,
      source: result.source,
    };
  }
}
