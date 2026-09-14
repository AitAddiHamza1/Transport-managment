import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { BUSINESS_TIMEZONE } from './utils/timezone.util';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Daily Cron task for Notifications System (Step 3B-4 V1 Complete).
   * Runs daily at midnight explicitly in Africa/Casablanca business timezone.
   * Invokes PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION + TRIP_ALERT.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: BUSINESS_TIMEZONE })
  async handleScheduledCron(): Promise<void> {
    this.logger.log('[NotificationsScheduler] Lancement du balayage quotidien (PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION + TRIP_ALERT + CLEANUP)...');
    try {
      const summaryPayment = await this.notificationsService.scanAllSupplierPaymentDue();
      this.logger.log(
        `[NotificationsScheduler] Balayage PAYMENT_DUE terminé : ${summaryPayment.scannedCompanies} entreprise(s) traitée(s), ${summaryPayment.totalGenerated} notification(s) créée(s), ${summaryPayment.totalDuplicatesPrevented} doublon(s) évité(s).`,
      );

      const summaryReceivable = await this.notificationsService.scanAllCustomerReceivableDue();
      this.logger.log(
        `[NotificationsScheduler] Balayage RECEIVABLE_DUE terminé : ${summaryReceivable.scannedCompanies} entreprise(s) traitée(s), ${summaryReceivable.totalGenerated} notification(s) créée(s), ${summaryReceivable.totalDuplicatesPrevented} doublon(s) évité(s).`,
      );

      const summaryDocExpiration = await this.notificationsService.scanAllDocumentExpirations();
      this.logger.log(
        `[NotificationsScheduler] Balayage DOCUMENT_EXPIRATION terminé : ${summaryDocExpiration.scannedCompanies} entreprise(s) traitée(s), ${summaryDocExpiration.totalGenerated} notification(s) créée(s), ${summaryDocExpiration.totalDuplicatesPrevented} doublon(s) évité(s).`,
      );

      const summaryTripAlert = await this.notificationsService.scanAllTripAlerts();
      this.logger.log(
        `[NotificationsScheduler] Balayage TRIP_ALERT terminé : ${summaryTripAlert.scannedCompanies} entreprise(s) traitée(s), ${summaryTripAlert.totalGenerated} notification(s) créée(s), ${summaryTripAlert.totalDuplicatesPrevented} doublon(s) évité(s).`,
      );

      const summaryRetention = await this.notificationsService.cleanExpiredNotifications();
      this.logger.log(
        `[NotificationsScheduler] Nettoyage de rétention terminé : ${summaryRetention.deletedRecipients} destinataire(s) supprimé(s), ${summaryRetention.deletedNotifications} notification(s) parente(s) supprimée(s).`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NotificationsScheduler] Erreur lors de l'exécution du balayage quotidien : ${error?.message}`,
        error?.stack,
      );
    }
  }

  /**
   * Safe public helper for manual/test invocation of scheduled checks (PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION + TRIP_ALERT + CLEANUP).
   */
  async runScheduledCheck(targetDateInput?: Date | string) {
    const payment = await this.notificationsService.scanAllSupplierPaymentDue(targetDateInput);
    const receivable = await this.notificationsService.scanAllCustomerReceivableDue(targetDateInput);
    const documentExpiration = await this.notificationsService.scanAllDocumentExpirations(targetDateInput);
    const tripAlert = await this.notificationsService.scanAllTripAlerts(targetDateInput);
    const retentionCleanup = await this.notificationsService.cleanExpiredNotifications();
    return { payment, receivable, documentExpiration, tripAlert, retentionCleanup };
  }
}

