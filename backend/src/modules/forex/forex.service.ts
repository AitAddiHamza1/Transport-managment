import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface ExchangeRateResult {
  rate: Prisma.Decimal;
  date: string; // YYYY-MM-DD
  source: string; // 'FRANKFURTER_BAM'
}

@Injectable()
export class ForexService {
  private readonly baseUrl = 'https://api.frankfurter.dev/v2';
  private readonly timeoutMs = 5000;

  /**
   * Fetches official EUR -> MAD exchange rate from Frankfurter v2 using Bank Al-Maghrib (BAM) provider.
   * @param dateStr Optional historical date (YYYY-MM-DD)
   */
  async getEurToMadRate(dateStr?: string): Promise<ExchangeRateResult> {
    let url = `${this.baseUrl}/rate/EUR/MAD?providers=BAM`;
    if (dateStr && dateStr.trim()) {
      const formattedDate = dateStr.trim().split('T')[0];
      url = `${this.baseUrl}/rate/EUR/MAD?date=${formattedDate}&providers=BAM`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Impossible de récupérer le taux de change automatique Bank Al-Maghrib (Statut: ${response.status}).`,
        );
      }

      const data: any = await response.json();

      if (
        !data ||
        typeof data.rate !== 'number' ||
        !Number.isFinite(data.rate) ||
        data.rate <= 0 ||
        !data.date ||
        data.base !== 'EUR' ||
        data.quote !== 'MAD'
      ) {
        throw new ServiceUnavailableException(
          'Données de taux de change invalides reçues de Bank Al-Maghrib.',
        );
      }

      return {
        rate: new Prisma.Decimal(data.rate),
        date: String(data.date),
        source: 'FRANKFURTER_BAM',
      };
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new ServiceUnavailableException(
        'Service de taux de change Bank Al-Maghrib temporairement indisponible. Veuillez saisir un taux manuel.',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
