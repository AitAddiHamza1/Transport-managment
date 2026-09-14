import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/paginated-result';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationItemView, UnreadCountResponse } from './dto/notification-response.dto';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from './notifications.constants';
import { computeEffectivePermissions } from '../../common/permissions/permissions';
import { calculatePercentageThresholds } from './utils/threshold-calculator.util';
import { getCasablancaDateString, parseCalendarDateToUtc } from './utils/timezone.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal creation foundation for Notifications + Recipients.
   * Atomic, tenant-isolated, recipient-validated, and deduplicated.
   */
  async createNotification(
    companyId: number,
    dto: CreateNotificationDto,
  ): Promise<{ created: boolean; notificationId?: number; reason?: string }> {
    if (!companyId) {
      throw new BadRequestException('ID entreprise requis pour créer une notification');
    }

    if (!dto.recipientUserIds || dto.recipientUserIds.length === 0) {
      throw new BadRequestException('Au moins un destinataire est requis');
    }

    // Validate recipients (FAIL CLOSED): Ensure ALL requested user IDs exist AND belong to target companyId
    const requestedUsers = await this.prisma.user.findMany({
      where: {
        id: { in: dto.recipientUserIds },
      },
      select: { id: true, companyId: true },
    });

    if (requestedUsers.length !== dto.recipientUserIds.length) {
      this.logger.warn(
        `Création rejetée (FAIL CLOSED) : un ou plusieurs destinataires n'existent pas`,
      );
      return { created: false, reason: 'RECIPIENT_NOT_FOUND_REJECTED' };
    }

    const crossTenantUser = requestedUsers.find((u) => u.companyId !== companyId);
    if (crossTenantUser) {
      this.logger.warn(
        `Création rejetée (FAIL CLOSED) : l'utilisateur #${crossTenantUser.id} n'appartient pas à l'entreprise #${companyId}`,
      );
      return { created: false, reason: 'RECIPIENT_CROSS_TENANT_REJECTED' };
    }

    const validUserIds = requestedUsers.map((u) => u.id);
    const priorite = dto.priorite || NOTIFICATION_PRIORITIES.NORMAL;

    try {
      const createdNotification = await this.prisma.$transaction(async (tx) => {
        const notif = await tx.notification.create({
          data: {
            companyId,
            type: dto.type,
            titre: dto.titre,
            message: dto.message,
            priorite,
            entityType: dto.entityType ?? null,
            entityId: dto.entityId ?? null,
            targetRoute: dto.targetRoute ?? null,
            dedupKey: dto.dedupKey ?? null,
            recipients: {
              createMany: {
                data: validUserIds.map((userId) => ({
                  userId,
                })),
              },
            },
          },
        });
        return notif;
      });

      return { created: true, notificationId: createdNotification.id };
    } catch (error: any) {
      // Handle Prisma P2002 (Unique constraint failed on [company_id, dedup_key])
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `Notification doublon empêchée (dedupKey: ${dto.dedupKey}, companyId: ${companyId})`,
        );
        return { created: false, reason: 'DUPLICATE_PREVENTED' };
      }
      throw error;
    }
  }

  /**
   * Retrieves paginated notifications for the logged-in user inside their company tenant.
   * Excludes dismissed items (`effaceLe IS NULL`).
   */
  async findAllForUser(
    companyId: number,
    userId: number,
    query: QueryNotificationDto,
  ): Promise<PaginatedResult<NotificationItemView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 20;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const whereRecipient: Prisma.NotificationRecipientWhereInput = {
      userId,
      effaceLe: null,
      notification: {
        companyId,
        ...(query.type ? { type: query.type } : {}),
      },
      ...(query.isRead !== undefined ? { lu: query.isRead } : {}),
    };

    const [total, recipients] = await Promise.all([
      this.prisma.notificationRecipient.count({ where: whereRecipient }),
      this.prisma.notificationRecipient.findMany({
        where: whereRecipient,
        include: {
          notification: true,
        },
        orderBy: [
          {
            notification: {
              creeLe: 'desc',
            },
          },
          {
            notificationId: 'desc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data: NotificationItemView[] = recipients.map((r) => ({
      id: r.id,
      notificationId: r.notificationId,
      companyId: r.notification.companyId,
      type: r.notification.type,
      titre: r.notification.titre,
      message: r.notification.message,
      priorite: r.notification.priorite,
      entityType: r.notification.entityType,
      entityId: r.notification.entityId,
      targetRoute: r.notification.targetRoute,
      dedupKey: r.notification.dedupKey,
      creeLe: r.notification.creeLe.toISOString(),
      lu: r.lu,
      luLe: r.luLe ? r.luLe.toISOString() : null,
    }));

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Calculates unread count for current user inside tenant.
   */
  async getUnreadCount(companyId: number, userId: number): Promise<UnreadCountResponse> {
    const unreadCount = await this.prisma.notificationRecipient.count({
      where: {
        userId,
        lu: false,
        effaceLe: null,
        notification: {
          companyId,
        },
      },
    });

    return { unreadCount };
  }

  /**
   * Marks a single notification recipient record as read for current user.
   */
  async markAsRead(
    companyId: number,
    userId: number,
    notificationId: number,
  ): Promise<{ message: string; id: number; lu: boolean; luLe: Date | null }> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        OR: [{ id: notificationId }, { notificationId }],
        userId,
        effaceLe: null,
        notification: {
          companyId,
        },
      },
    });

    if (!recipient) {
      throw new NotFoundException(`Notification #${notificationId} introuvable pour l'utilisateur`);
    }

    const updatedRecipient = await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: {
        lu: true,
        luLe: new Date(),
      },
    });

    return {
      message: 'Notification marquée comme lue',
      id: updatedRecipient.id,
      lu: updatedRecipient.lu,
      luLe: updatedRecipient.luLe,
    };
  }

  /**
   * Marks all unread notifications as read for current user inside tenant.
   */
  async markAllAsRead(companyId: number, userId: number): Promise<{ count: number; message: string }> {
    const activeUnreadRecipients = await this.prisma.notificationRecipient.findMany({
      where: {
        userId,
        lu: false,
        effaceLe: null,
        notification: {
          companyId,
        },
      },
      select: { id: true },
    });

    if (activeUnreadRecipients.length === 0) {
      return { count: 0, message: 'Aucune notification à marquer comme lue' };
    }

    const recipientIds = activeUnreadRecipients.map((r) => r.id);

    const result = await this.prisma.notificationRecipient.updateMany({
      where: {
        id: { in: recipientIds },
      },
      data: {
        lu: true,
        luLe: new Date(),
      },
    });

    return { count: result.count, message: `${result.count} notification(s) marquée(s) comme lue(s)` };
  }

  /**
   * Soft dismisses a notification for current user by setting effaceLe.
   */
  async dismissNotification(
    companyId: number,
    userId: number,
    notificationId: number,
  ): Promise<{ message: string }> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        OR: [{ id: notificationId }, { notificationId }],
        userId,
        effaceLe: null,
        notification: {
          companyId,
        },
      },
    });

    if (!recipient) {
      throw new NotFoundException(`Notification #${notificationId} introuvable pour l'utilisateur`);
    }

    await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: {
        effaceLe: new Date(),
      },
    });

    return { message: 'Notification masquée' };
  }

  /**
   * Cleans up read notifications 30 days after read timestamp (luLe)
   * and dismissed notifications 30 days after dismissal timestamp (effaceLe).
   * Deletes orphan parent Notification records with zero remaining recipients.
   */
  async cleanExpiredNotifications(cutoffDateInput?: Date): Promise<{
    deletedRecipients: number;
    deletedNotifications: number;
  }> {
    const cutoff = cutoffDateInput ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recipientsResult = await this.prisma.notificationRecipient.deleteMany({
      where: {
        OR: [
          { lu: true, luLe: { lte: cutoff } },
          { effaceLe: { not: null, lte: cutoff } },
        ],
      },
    });

    const notificationsResult = await this.prisma.notification.deleteMany({
      where: {
        recipients: {
          none: {},
        },
      },
    });

    return {
      deletedRecipients: recipientsResult.count,
      deletedNotifications: notificationsResult.count,
    };
  }

  /**
   * Safe target route resolver for notifications (prevents arbitrary external route inputs).
   */
  public resolveTargetRoute(entityType?: string | null, entityId?: number | null): string | null {
    if (!entityType) return null;
    switch (entityType) {
      case 'DETTE_FOURNISSEUR':
        return '/dettes-fournisseurs';
      case 'CREANCE_CLIENT':
        return '/creances-clients';
      case 'DOCUMENT_VEHICULE':
        return '/documents-vehicules';
      case 'DOCUMENT_EMPLOYE':
        return '/employes';
      case 'VOYAGE':
        return '/voyages';
      default:
        return null;
    }
  }

  /**
   * Resolves authorized recipient user IDs belonging to target companyId with required module permission.
   * Enforces strict tenant scoping and FAIL CLOSED logic.
   */
  public async getEligibleRecipientsForCompany(
    companyId: number,
    moduleKey: string = 'dettes_fournisseurs',
    requestedUserIds?: number[],
  ): Promise<number[]> {
    if (!companyId) return [];

    if (requestedUserIds && requestedUserIds.length > 0) {
      const requestedUsers = await this.prisma.user.findMany({
        where: { id: { in: requestedUserIds } },
        select: {
          id: true,
          companyId: true,
          permissions: true,
          statut: true,
          role: { select: { nom: true } },
        },
      });

      // FAIL CLOSED: All requested IDs must exist
      if (requestedUsers.length !== requestedUserIds.length) {
        throw new BadRequestException("Un ou plusieurs destinataires spécifiés sont introuvables");
      }

      // FAIL CLOSED: All requested users must belong to target companyId
      const invalidTenant = requestedUsers.find((u) => u.companyId !== companyId);
      if (invalidTenant) {
        throw new BadRequestException(
          `Accès refusé : l'utilisateur #${invalidTenant.id} n'appartient pas à l'entreprise #${companyId}`,
        );
      }

      // FAIL CLOSED: All requested users must have module permission
      for (const user of requestedUsers) {
        const perms = computeEffectivePermissions(user.role?.nom || '', user.permissions);
        const hasPerm = perms[moduleKey]?.voir === true;
        if (!hasPerm) {
          throw new BadRequestException(
            `Accès refusé : l'utilisateur #${user.id} ne possède pas la permission de consulter le module ${moduleKey}`,
          );
        }
      }

      return requestedUsers.map((u) => u.id);
    }

    // Default scanner mode: Fetch all active users in company and filter by permission
    const activeUsers = await this.prisma.user.findMany({
      where: {
        companyId,
        statut: 'ACTIF',
      },
      select: {
        id: true,
        permissions: true,
        role: { select: { nom: true } },
      },
    });

    return activeUsers
      .filter((user) => {
        const perms = computeEffectivePermissions(user.role?.nom || '', user.permissions);
        return perms[moduleKey]?.voir === true;
      })
      .map((user) => user.id);
  }

  /**
   * Scans active supplier debts (DetteFournisseur) for a single company tenant
   * and generates PAYMENT_DUE threshold & overdue notifications safely.
   */
  async scanSupplierPaymentDueForCompany(
    companyId: number,
    targetDateInput?: Date | string,
  ): Promise<{ scannedDebts: number; generatedNotifications: number; duplicatesPrevented: number }> {
    if (!companyId) {
      throw new BadRequestException("ID entreprise requis pour la numérisation des échéances");
    }

    // Resolve explicit Africa/Casablanca business calendar date string (YYYY-MM-DD)
    const todayStr = getCasablancaDateString(targetDateInput);
    if (!todayStr) {
      throw new BadRequestException("Date de référence invalide");
    }
    const todayUtc = parseCalendarDateToUtc(todayStr);

    // Resolve authorized recipients for dettes_fournisseurs in this company
    const recipientUserIds = await this.getEligibleRecipientsForCompany(companyId, 'dettes_fournisseurs');
    if (recipientUserIds.length === 0) {
      this.logger.warn(`Aucun utilisateur autorisé à recevoir les alertes dettes pour l'entreprise #${companyId}`);
      return { scannedDebts: 0, generatedNotifications: 0, duplicatesPrevented: 0 };
    }

    // Load active (non-deleted) supplier debts for current company only
    const debts = await this.prisma.detteFournisseur.findMany({
      where: {
        companyId,
        supprimeLe: null,
      },
      include: {
        paiements: {
          select: {
            montant: true,
            estAnnule: true,
          },
        },
      },
    });

    let generatedNotifications = 0;
    let duplicatesPrevented = 0;

    for (const dette of debts) {
      // Validate reference date and payment terms
      if (!dette.dateDette || dette.delaiPaiementJours === null || dette.delaiPaiementJours === undefined) {
        continue;
      }

      const dateDetteStr = getCasablancaDateString(dette.dateDette);
      if (!dateDetteStr) {
        continue;
      }
      const dateDetteUtc = parseCalendarDateToUtc(dateDetteStr);

      // Derive exact dateEcheance = dateDette + delaiPaiementJours
      const dateEcheanceUtc = parseCalendarDateToUtc(dateDetteStr);
      dateEcheanceUtc.setUTCDate(dateEcheanceUtc.getUTCDate() + dette.delaiPaiementJours);
      const dateEcheanceStr = dateEcheanceUtc.toISOString().substring(0, 10);

      // Evaluate financial balance soldeRestant
      const activePaymentsSum = dette.paiements
        .filter((p) => !p.estAnnule)
        .reduce((sum, p) => sum + Number(p.montant), 0);
      const montantDu = Number(dette.montantDu);
      const soldeRestant = Math.max(0, Math.round((montantDu - activePaymentsSum) * 100) / 100);

      // Rule: Fully paid debts MUST NOT generate PAYMENT_DUE notifications
      if (soldeRestant <= 0) {
        continue;
      }

      const targetRoute = this.resolveTargetRoute('DETTE_FOURNISSEUR', dette.id);

      // Calculate percentage-based thresholds
      const thresholds = calculatePercentageThresholds(dateDetteUtc, dateEcheanceUtc);

      for (const threshold of thresholds) {
        const thresholdDateStr = threshold.notificationDate.toISOString().substring(0, 10);

        if (thresholdDateStr === todayStr) {
          const dedupKey = `PAYMENT_DUE:${dette.id}:${threshold.thresholdKey}`;
          let titre = `Avis d'échéance : Dette fournisseur #${dette.numeroDette}`;
          if (threshold.percentage === 20) {
            titre = `Échéance proche : Dette fournisseur #${dette.numeroDette}`;
          } else if (threshold.percentage === 10) {
            titre = `Rappel urgent : Dette fournisseur #${dette.numeroDette}`;
          } else if (threshold.percentage === 0) {
            titre = `Dette fournisseur à régler : #${dette.numeroDette}`;
          }

          const message = `La dette n° ${dette.numeroDette} de ${dette.nomFournisseurSnapshot} (solde : ${soldeRestant.toFixed(2)} MAD) arrive à échéance le ${dateEcheanceStr}.`;

          const result = await this.createNotification(companyId, {
            type: NOTIFICATION_CATEGORIES.PAYMENT_DUE,
            titre,
            message,
            priorite: threshold.priority,
            entityType: 'DETTE_FOURNISSEUR',
            entityId: dette.id,
            targetRoute: targetRoute ?? undefined,
            dedupKey,
            recipientUserIds,
          });

          if (result.created) {
            generatedNotifications++;
          } else if (result.reason === 'DUPLICATE_PREVENTED') {
            duplicatesPrevented++;
          }
        }
      }

      // Check Overdue state: if todayUtc > dateEcheanceUtc and soldeRestant > 0
      if (todayUtc.getTime() > dateEcheanceUtc.getTime()) {
        const dedupKey = `PAYMENT_DUE:${dette.id}:OVERDUE`;
        const titre = `Dette fournisseur en retard : #${dette.numeroDette}`;
        const message = `La dette n° ${dette.numeroDette} de ${dette.nomFournisseurSnapshot} est en retard depuis le ${dateEcheanceStr}. Solde restant : ${soldeRestant.toFixed(2)} MAD.`;

        const result = await this.createNotification(companyId, {
          type: NOTIFICATION_CATEGORIES.PAYMENT_DUE,
          titre,
          message,
          priorite: NOTIFICATION_PRIORITIES.URGENT,
          entityType: 'DETTE_FOURNISSEUR',
          entityId: dette.id,
          targetRoute: targetRoute ?? undefined,
          dedupKey,
          recipientUserIds,
        });

        if (result.created) {
          generatedNotifications++;
        } else if (result.reason === 'DUPLICATE_PREVENTED') {
          duplicatesPrevented++;
        }
      }
    }

    return {
      scannedDebts: debts.length,
      generatedNotifications,
      duplicatesPrevented,
    };
  }

  /**
   * Scans supplier payment dues across all active companies.
   */
  async scanAllSupplierPaymentDue(
    targetDateInput?: Date | string,
  ): Promise<{ scannedCompanies: number; totalGenerated: number; totalDuplicatesPrevented: number }> {
    const activeCompanies = await this.prisma.company.findMany({
      where: { statut: 'ACTIF' },
      select: { id: true, nom: true },
    });

    let totalGenerated = 0;
    let totalDuplicatesPrevented = 0;

    for (const comp of activeCompanies) {
      const res = await this.scanSupplierPaymentDueForCompany(comp.id, targetDateInput);
      totalGenerated += res.generatedNotifications;
      totalDuplicatesPrevented += res.duplicatesPrevented;
    }

    return {
      scannedCompanies: activeCompanies.length,
      totalGenerated,
      totalDuplicatesPrevented,
    };
  }

  /**
   * Scans active customer receivables (CreanceClient) for a single company tenant
   * and generates RECEIVABLE_DUE threshold & overdue notifications safely.
   */
  async scanCustomerReceivableDueForCompany(
    companyId: number,
    targetDateInput?: Date | string,
  ): Promise<{ scannedReceivables: number; generatedNotifications: number; duplicatesPrevented: number }> {
    if (!companyId) {
      throw new BadRequestException("ID entreprise requis pour la numérisation des créances");
    }

    // Resolve explicit Africa/Casablanca business calendar date string (YYYY-MM-DD)
    const todayStr = getCasablancaDateString(targetDateInput);
    if (!todayStr) {
      throw new BadRequestException("Date de référence invalide");
    }
    const todayUtc = parseCalendarDateToUtc(todayStr);

    // Resolve authorized recipients for creances_clients in this company
    const recipientUserIds = await this.getEligibleRecipientsForCompany(companyId, 'creances_clients');
    if (recipientUserIds.length === 0) {
      this.logger.warn(`Aucun utilisateur autorisé à recevoir les alertes créances pour l'entreprise #${companyId}`);
      return { scannedReceivables: 0, generatedNotifications: 0, duplicatesPrevented: 0 };
    }

    // Fetch invoice numbers belonging to target companyId and non-deleted (supprimeLe === null)
    const companyInvoices = await this.prisma.facture.findMany({
      where: { companyId, supprimeLe: null },
      select: { numeroFacture: true },
    });

    if (companyInvoices.length === 0) {
      return { scannedReceivables: 0, generatedNotifications: 0, duplicatesPrevented: 0 };
    }

    const companyInvoiceNumbers = companyInvoices.map((f) => f.numeroFacture);

    // Load CreanceClient records for the target company's active invoices
    const creances = await this.prisma.creanceClient.findMany({
      where: {
        numeroFacture: { in: companyInvoiceNumbers },
      },
    });

    let generatedNotifications = 0;
    let duplicatesPrevented = 0;

    for (const creance of creances) {
      // Validate reference date and payment terms
      if (!creance.dateEmission) {
        continue;
      }

      const dateEmissionStr = getCasablancaDateString(creance.dateEmission);
      if (!dateEmissionStr) {
        continue;
      }
      const dateEmissionUtc = parseCalendarDateToUtc(dateEmissionStr);

      // Determine due date (dateEcheance or dateEmission + delaiPaiementJours)
      let dateEcheanceUtc: Date;
      if (creance.dateEcheance) {
        const dateEcheanceStr = getCasablancaDateString(creance.dateEcheance);
        if (!dateEcheanceStr) continue;
        dateEcheanceUtc = parseCalendarDateToUtc(dateEcheanceStr);
      } else {
        const delai = creance.delaiPaiementJours ?? 30;
        dateEcheanceUtc = parseCalendarDateToUtc(dateEmissionStr);
        dateEcheanceUtc.setUTCDate(dateEcheanceUtc.getUTCDate() + delai);
      }

      const dateEcheanceStr = dateEcheanceUtc.toISOString().substring(0, 10);

      // Evaluate financial balance (soldeRestant) using Prisma.Decimal safe arithmetic
      const montantFactureDecimal = creance.montantFacture
        ? new Prisma.Decimal(creance.montantFacture)
        : new Prisma.Decimal(0);
      const montantRecuDecimal = creance.montantRecu
        ? new Prisma.Decimal(creance.montantRecu)
        : new Prisma.Decimal(0);
      const rawSoldeDecimal =
        creance.solde !== null && creance.solde !== undefined
          ? new Prisma.Decimal(creance.solde)
          : montantFactureDecimal.sub(montantRecuDecimal);

      const soldeRestantDecimal = rawSoldeDecimal.isNegative()
        ? new Prisma.Decimal(0)
        : rawSoldeDecimal;
      const soldeRestantNum = soldeRestantDecimal.toNumber();

      // Rule: Receivables with zero or negative remaining balance MUST NOT generate RECEIVABLE_DUE notifications.
      // Authoritative eligibility relies on positive financial balance (soldeRestantDecimal > 0).
      if (soldeRestantDecimal.lessThanOrEqualTo(0)) {
        continue;
      }

      const targetRoute = this.resolveTargetRoute('CREANCE_CLIENT', creance.id);

      // Calculate percentage-based thresholds
      const thresholds = calculatePercentageThresholds(dateEmissionUtc, dateEcheanceUtc);

      for (const threshold of thresholds) {
        const thresholdDateStr = threshold.notificationDate.toISOString().substring(0, 10);

        if (thresholdDateStr === todayStr) {
          const dedupKey = `RECEIVABLE_DUE:${creance.id}:${threshold.thresholdKey}`;
          let titre = `Avis d'échéance : Créance client #${creance.numeroFacture}`;
          if (threshold.percentage === 20) {
            titre = `Échéance proche : Créance client #${creance.numeroFacture}`;
          } else if (threshold.percentage === 10) {
            titre = `Rappel urgent : Créance client #${creance.numeroFacture}`;
          } else if (threshold.percentage === 0) {
            titre = `Créance client à régler : #${creance.numeroFacture}`;
          }

          const message = `La créance n° ${creance.numeroFacture} du client ${creance.nomClient} (solde : ${soldeRestantDecimal.toFixed(2)} MAD) arrive à échéance le ${dateEcheanceStr}.`;

          const result = await this.createNotification(companyId, {
            type: NOTIFICATION_CATEGORIES.RECEIVABLE_DUE,
            titre,
            message,
            priorite: threshold.priority,
            entityType: 'CREANCE_CLIENT',
            entityId: creance.id,
            targetRoute: targetRoute ?? undefined,
            dedupKey,
            recipientUserIds,
          });

          if (result.created) {
            generatedNotifications++;
          } else if (result.reason === 'DUPLICATE_PREVENTED') {
            duplicatesPrevented++;
          }
        }
      }

      // Check Overdue state: if todayUtc > dateEcheanceUtc and soldeRestant > 0
      if (todayUtc.getTime() > dateEcheanceUtc.getTime()) {
        const dedupKey = `RECEIVABLE_DUE:${creance.id}:OVERDUE`;
        const titre = `Créance client en retard : #${creance.numeroFacture}`;
        const message = `La créance n° ${creance.numeroFacture} du client ${creance.nomClient} est en retard depuis le ${dateEcheanceStr}. Solde restant : ${soldeRestantDecimal.toFixed(2)} MAD.`;

        const result = await this.createNotification(companyId, {
          type: NOTIFICATION_CATEGORIES.RECEIVABLE_DUE,
          titre,
          message,
          priorite: NOTIFICATION_PRIORITIES.URGENT,
          entityType: 'CREANCE_CLIENT',
          entityId: creance.id,
          targetRoute: targetRoute ?? undefined,
          dedupKey,
          recipientUserIds,
        });

        if (result.created) {
          generatedNotifications++;
        } else if (result.reason === 'DUPLICATE_PREVENTED') {
          duplicatesPrevented++;
        }
      }
    }

    return {
      scannedReceivables: creances.length,
      generatedNotifications,
      duplicatesPrevented,
    };
  }

  /**
   * Scans customer receivable dues across all active companies.
   */
  async scanAllCustomerReceivableDue(
    targetDateInput?: Date | string,
  ): Promise<{ scannedCompanies: number; totalGenerated: number; totalDuplicatesPrevented: number }> {
    const activeCompanies = await this.prisma.company.findMany({
      where: { statut: 'ACTIF' },
      select: { id: true, nom: true },
    });

    let totalGenerated = 0;
    let totalDuplicatesPrevented = 0;

    for (const comp of activeCompanies) {
      const res = await this.scanCustomerReceivableDueForCompany(comp.id, targetDateInput);
      totalGenerated += res.generatedNotifications;
      totalDuplicatesPrevented += res.duplicatesPrevented;
    }

    return {
      scannedCompanies: activeCompanies.length,
      totalGenerated,
      totalDuplicatesPrevented,
    };
  }

  /**
   * Scans expirable documents (DocumentVehicule & DocumentEmploye) for a single company tenant
   * and generates DOCUMENT_EXPIRATION threshold & expired notifications safely.
   */
  async scanDocumentExpirationsForCompany(
    companyId: number,
    targetDateInput?: Date | string,
  ): Promise<{ scannedDocuments: number; generatedNotifications: number; duplicatesPrevented: number }> {
    if (!companyId) {
      throw new BadRequestException("ID entreprise requis pour la numérisation des documents");
    }

    // Resolve explicit Africa/Casablanca business calendar date string (YYYY-MM-DD)
    const todayStr = getCasablancaDateString(targetDateInput);
    if (!todayStr) {
      throw new BadRequestException("Date de référence invalide");
    }
    const todayUtc = parseCalendarDateToUtc(todayStr);

    let scannedDocuments = 0;
    let generatedNotifications = 0;
    let duplicatesPrevented = 0;

    // -----------------------------------------------------------------
    // 1. Process DocumentVehicule
    // -----------------------------------------------------------------
    const recipientVehicules = await this.getEligibleRecipientsForCompany(companyId, 'documents_vehicules');
    if (recipientVehicules.length > 0) {
      const vehiculeDocs = await this.prisma.documentVehicule.findMany({
        where: {
          supprimeLe: null,
          vehicule: { companyId },
        },
        include: {
          vehicule: {
            select: { immatriculation: true },
          },
        },
      });

      scannedDocuments += vehiculeDocs.length;

      for (const doc of vehiculeDocs) {
        if (!doc.dateExpiration) continue;

        const dateExpirationStr = getCasablancaDateString(doc.dateExpiration);
        if (!dateExpirationStr) continue;
        const dateExpirationUtc = parseCalendarDateToUtc(dateExpirationStr);

        const targetRoute = this.resolveTargetRoute('DOCUMENT_VEHICULE', doc.idDocument);

        // Percentage-based thresholds ONLY if valid dateEmission exists
        if (doc.dateEmission) {
          const dateEmissionStr = getCasablancaDateString(doc.dateEmission);
          if (dateEmissionStr) {
            const dateEmissionUtc = parseCalendarDateToUtc(dateEmissionStr);
            if (dateExpirationUtc.getTime() > dateEmissionUtc.getTime()) {
              const thresholds = calculatePercentageThresholds(dateEmissionUtc, dateExpirationUtc);

              for (const threshold of thresholds) {
                const thresholdDateStr = threshold.notificationDate.toISOString().substring(0, 10);

                if (thresholdDateStr === todayStr) {
                  const dedupKey = `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${doc.idDocument}:${threshold.thresholdKey}`;
                  let titre = `Document véhicule bientôt expiré : ${doc.typeDocument}`;
                  if (threshold.percentage === 20) {
                    titre = `Document véhicule proche de l'expiration : ${doc.typeDocument}`;
                  } else if (threshold.percentage === 10) {
                    titre = `Rappel urgent document véhicule : ${doc.typeDocument}`;
                  } else if (threshold.percentage === 0) {
                    titre = `Document véhicule expire aujourd'hui : ${doc.typeDocument}`;
                  }

                  const docIdent = doc.numeroDocument ? `n° ${doc.numeroDocument}` : `véhicule ${doc.immatriculation}`;
                  const message = `Le document "${doc.typeDocument}" (${docIdent}) du véhicule ${doc.immatriculation} expire le ${dateExpirationStr}.`;

                  const result = await this.createNotification(companyId, {
                    type: NOTIFICATION_CATEGORIES.DOCUMENT_EXPIRATION,
                    titre,
                    message,
                    priorite: threshold.priority,
                    entityType: 'DOCUMENT_VEHICULE',
                    entityId: doc.idDocument,
                    targetRoute: targetRoute ?? undefined,
                    dedupKey,
                    recipientUserIds: recipientVehicules,
                  });

                  if (result.created) {
                    generatedNotifications++;
                  } else if (result.reason === 'DUPLICATE_PREVENTED') {
                    duplicatesPrevented++;
                  }
                }
              }
            }
          }
        }

        // Expired check: if todayUtc > dateExpirationUtc
        if (todayUtc.getTime() > dateExpirationUtc.getTime()) {
          const dedupKey = `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${doc.idDocument}:EXPIRED`;
          const titre = `Document véhicule expiré : ${doc.typeDocument}`;
          const docIdent = doc.numeroDocument ? `n° ${doc.numeroDocument}` : `véhicule ${doc.immatriculation}`;
          const message = `Le document "${doc.typeDocument}" (${docIdent}) du véhicule ${doc.immatriculation} a expiré le ${dateExpirationStr}.`;

          const result = await this.createNotification(companyId, {
            type: NOTIFICATION_CATEGORIES.DOCUMENT_EXPIRATION,
            titre,
            message,
            priorite: NOTIFICATION_PRIORITIES.URGENT,
            entityType: 'DOCUMENT_VEHICULE',
            entityId: doc.idDocument,
            targetRoute: targetRoute ?? undefined,
            dedupKey,
            recipientUserIds: recipientVehicules,
          });

          if (result.created) {
            generatedNotifications++;
          } else if (result.reason === 'DUPLICATE_PREVENTED') {
            duplicatesPrevented++;
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // 2. Process DocumentEmploye
    // -----------------------------------------------------------------
    const recipientEmployes = await this.getEligibleRecipientsForCompany(companyId, 'employes');
    if (recipientEmployes.length > 0) {
      const employeDocs = await this.prisma.documentEmploye.findMany({
        where: {
          employe: { companyId, supprimeLe: null },
        },
        include: {
          employe: {
            select: { id: true, nom: true, prenom: true, matricule: true },
          },
        },
      });

      scannedDocuments += employeDocs.length;

      for (const doc of employeDocs) {
        if (!doc.dateExpiration) continue;

        const dateExpirationStr = getCasablancaDateString(doc.dateExpiration);
        if (!dateExpirationStr) continue;
        const dateExpirationUtc = parseCalendarDateToUtc(dateExpirationStr);

        const targetRoute = this.resolveTargetRoute('DOCUMENT_EMPLOYE', doc.id);

        // Percentage-based thresholds ONLY if valid dateEmission exists
        if (doc.dateEmission) {
          const dateEmissionStr = getCasablancaDateString(doc.dateEmission);
          if (dateEmissionStr) {
            const dateEmissionUtc = parseCalendarDateToUtc(dateEmissionStr);
            if (dateExpirationUtc.getTime() > dateEmissionUtc.getTime()) {
              const thresholds = calculatePercentageThresholds(dateEmissionUtc, dateExpirationUtc);

              for (const threshold of thresholds) {
                const thresholdDateStr = threshold.notificationDate.toISOString().substring(0, 10);

                if (thresholdDateStr === todayStr) {
                  const dedupKey = `DOCUMENT_EXPIRATION:DOCUMENT_EMPLOYE:${doc.id}:${threshold.thresholdKey}`;
                  let titre = `Document employé bientôt expiré : ${doc.typeDocument}`;
                  if (threshold.percentage === 20) {
                    titre = `Document employé proche de l'expiration : ${doc.typeDocument}`;
                  } else if (threshold.percentage === 10) {
                    titre = `Rappel urgent document employé : ${doc.typeDocument}`;
                  } else if (threshold.percentage === 0) {
                    titre = `Document employé expire aujourd'hui : ${doc.typeDocument}`;
                  }

                  const empNomComplet = `${doc.employe.prenom} ${doc.employe.nom}`;
                  const docIdent = doc.numeroDocument ? `n° ${doc.numeroDocument}` : `employé ${doc.employe.matricule}`;
                  const message = `Le document "${doc.typeDocument}" (${docIdent}) de l'employé ${empNomComplet} (${doc.employe.matricule}) expire le ${dateExpirationStr}.`;

                  const result = await this.createNotification(companyId, {
                    type: NOTIFICATION_CATEGORIES.DOCUMENT_EXPIRATION,
                    titre,
                    message,
                    priorite: threshold.priority,
                    entityType: 'DOCUMENT_EMPLOYE',
                    entityId: doc.id,
                    targetRoute: targetRoute ?? undefined,
                    dedupKey,
                    recipientUserIds: recipientEmployes,
                  });

                  if (result.created) {
                    generatedNotifications++;
                  } else if (result.reason === 'DUPLICATE_PREVENTED') {
                    duplicatesPrevented++;
                  }
                }
              }
            }
          }
        }

        // Expired check: if todayUtc > dateExpirationUtc
        if (todayUtc.getTime() > dateExpirationUtc.getTime()) {
          const dedupKey = `DOCUMENT_EXPIRATION:DOCUMENT_EMPLOYE:${doc.id}:EXPIRED`;
          const titre = `Document employé expiré : ${doc.typeDocument}`;
          const empNomComplet = `${doc.employe.prenom} ${doc.employe.nom}`;
          const docIdent = doc.numeroDocument ? `n° ${doc.numeroDocument}` : `employé ${doc.employe.matricule}`;
          const message = `Le document "${doc.typeDocument}" (${docIdent}) de l'employé ${empNomComplet} (${doc.employe.matricule}) a expiré le ${dateExpirationStr}.`;

          const result = await this.createNotification(companyId, {
            type: NOTIFICATION_CATEGORIES.DOCUMENT_EXPIRATION,
            titre,
            message,
            priorite: NOTIFICATION_PRIORITIES.URGENT,
            entityType: 'DOCUMENT_EMPLOYE',
            entityId: doc.id,
            targetRoute: targetRoute ?? undefined,
            dedupKey,
            recipientUserIds: recipientEmployes,
          });

          if (result.created) {
            generatedNotifications++;
          } else if (result.reason === 'DUPLICATE_PREVENTED') {
            duplicatesPrevented++;
          }
        }
      }
    }

    return {
      scannedDocuments,
      generatedNotifications,
      duplicatesPrevented,
    };
  }

  /**
   * Scans document expirations across all active companies.
   */
  async scanAllDocumentExpirations(
    targetDateInput?: Date | string,
  ): Promise<{ scannedCompanies: number; totalGenerated: number; totalDuplicatesPrevented: number }> {
    const activeCompanies = await this.prisma.company.findMany({
      where: { statut: 'ACTIF' },
      select: { id: true, nom: true },
    });

    let totalGenerated = 0;
    let totalDuplicatesPrevented = 0;

    for (const comp of activeCompanies) {
      const res = await this.scanDocumentExpirationsForCompany(comp.id, targetDateInput);
      totalGenerated += res.generatedNotifications;
      totalDuplicatesPrevented += res.duplicatesPrevented;
    }

    return {
      scannedCompanies: activeCompanies.length,
      totalGenerated,
      totalDuplicatesPrevented,
    };
  }

  /**
   * Scans trips (Voyage) for a single company tenant
   * and generates TRIP_ALERT notifications (unassigned resources, upcoming departure, overdue departure) safely.
   */
  async scanTripAlertsForCompany(
    companyId: number,
    targetDateInput?: Date | string,
  ): Promise<{ scannedVoyages: number; generatedNotifications: number; duplicatesPrevented: number }> {
    if (!companyId) {
      throw new BadRequestException("ID entreprise requis pour la numérisation des voyages");
    }

    // Resolve explicit Africa/Casablanca business calendar date string (YYYY-MM-DD)
    const todayStr = getCasablancaDateString(targetDateInput);
    if (!todayStr) {
      throw new BadRequestException("Date de référence invalide");
    }
    const todayUtc = parseCalendarDateToUtc(todayStr);

    // Resolve authorized recipients for voyages in this company
    const recipientUserIds = await this.getEligibleRecipientsForCompany(companyId, 'voyages');
    if (recipientUserIds.length === 0) {
      this.logger.warn(`Aucun utilisateur autorisé à recevoir les alertes voyages pour l'entreprise #${companyId}`);
      return { scannedVoyages: 0, generatedNotifications: 0, duplicatesPrevented: 0 };
    }

    // Fetch active planned voyages for current company (statut = PLANIFIE)
    // Note: Cancelled (ANNULE), Delivered (LIVRE), Invoiced (FACTURE), and In Progress (EN_COURS) trips do not trigger departure alerts.
    const voyages = await this.prisma.voyage.findMany({
      where: {
        companyId,
        statut: 'PLANIFIE',
      },
    });

    let generatedNotifications = 0;
    let duplicatesPrevented = 0;

    for (const voyage of voyages) {
      if (!voyage.dateChargement) continue;

      const dateChargementStr = getCasablancaDateString(voyage.dateChargement);
      if (!dateChargementStr) continue;
      const dateChargementUtc = parseCalendarDateToUtc(dateChargementStr);

      const targetRoute = this.resolveTargetRoute('VOYAGE', voyage.idVoyage);

      const isUnassigned = !voyage.tracteur || !voyage.nomConducteur;

      // EVENT 1: Unassigned resources on upcoming or today departure date
      if (isUnassigned && dateChargementUtc.getTime() >= todayUtc.getTime()) {
        const resourceState = `T:${voyage.tracteur || 'NONE'}|D:${voyage.nomConducteur || 'NONE'}`;
        const dedupKey = `TRIP_ALERT:${voyage.idVoyage}:UNASSIGNED_RESOURCES:${resourceState}`;
        const titre = `Voyage non assigné : Voyage #${voyage.idVoyage}`;
        const missingDetails: string[] = [];
        if (!voyage.nomConducteur) missingDetails.push('conducteur');
        if (!voyage.tracteur) missingDetails.push('véhicule tracteur');
        const missingStr = missingDetails.join(' et ');

        const message = `Le voyage n° ${voyage.idVoyage} (${voyage.nomClient || 'Client'}) prévu le ${dateChargementStr} manque d'affectation (${missingStr}).`;

        const result = await this.createNotification(companyId, {
          type: NOTIFICATION_CATEGORIES.TRIP_ALERT,
          titre,
          message,
          priorite: NOTIFICATION_PRIORITIES.HIGH,
          entityType: 'VOYAGE',
          entityId: voyage.idVoyage,
          targetRoute: targetRoute ?? undefined,
          dedupKey,
          recipientUserIds,
        });

        if (result.created) {
          generatedNotifications++;
        } else if (result.reason === 'DUPLICATE_PREVENTED') {
          duplicatesPrevented++;
        }
      }

      // EVENT 2: Departure upcoming (planned departure is TODAY)
      if (dateChargementStr === todayStr) {
        const dedupKey = `TRIP_ALERT:${voyage.idVoyage}:DEPARTURE_UPCOMING`;
        const titre = `Départ prévu aujourd'hui : Voyage #${voyage.idVoyage}`;
        const message = `Le voyage n° ${voyage.idVoyage} pour ${voyage.nomClient || 'Client'} (${voyage.lieuChargement} -> ${voyage.lieuDechargement}) est prévu pour aujourd'hui.`;

        const result = await this.createNotification(companyId, {
          type: NOTIFICATION_CATEGORIES.TRIP_ALERT,
          titre,
          message,
          priorite: NOTIFICATION_PRIORITIES.NORMAL,
          entityType: 'VOYAGE',
          entityId: voyage.idVoyage,
          targetRoute: targetRoute ?? undefined,
          dedupKey,
          recipientUserIds,
        });

        if (result.created) {
          generatedNotifications++;
        } else if (result.reason === 'DUPLICATE_PREVENTED') {
          duplicatesPrevented++;
        }
      }

      // EVENT 3: Departure overdue (today > planned departure date, still in PLANIFIE status)
      if (todayUtc.getTime() > dateChargementUtc.getTime()) {
        const dedupKey = `TRIP_ALERT:${voyage.idVoyage}:DEPARTURE_OVERDUE`;
        const titre = `Voyage en retard de départ : Voyage #${voyage.idVoyage}`;
        const message = `Le voyage n° ${voyage.idVoyage} (${voyage.nomClient || 'Client'}) prévu le ${dateChargementStr} n'a pas encore démarré.`;

        const result = await this.createNotification(companyId, {
          type: NOTIFICATION_CATEGORIES.TRIP_ALERT,
          titre,
          message,
          priorite: NOTIFICATION_PRIORITIES.URGENT,
          entityType: 'VOYAGE',
          entityId: voyage.idVoyage,
          targetRoute: targetRoute ?? undefined,
          dedupKey,
          recipientUserIds,
        });

        if (result.created) {
          generatedNotifications++;
        } else if (result.reason === 'DUPLICATE_PREVENTED') {
          duplicatesPrevented++;
        }
      }
    }

    return {
      scannedVoyages: voyages.length,
      generatedNotifications,
      duplicatesPrevented,
    };
  }

  /**
   * Scans trip alerts across all active companies.
   */
  async scanAllTripAlerts(
    targetDateInput?: Date | string,
  ): Promise<{ scannedCompanies: number; totalGenerated: number; totalDuplicatesPrevented: number }> {
    const activeCompanies = await this.prisma.company.findMany({
      where: { statut: 'ACTIF' },
      select: { id: true, nom: true },
    });

    let totalGenerated = 0;
    let totalDuplicatesPrevented = 0;

    for (const comp of activeCompanies) {
      const res = await this.scanTripAlertsForCompany(comp.id, targetDateInput);
      totalGenerated += res.generatedNotifications;
      totalDuplicatesPrevented += res.duplicatesPrevented;
    }

    return {
      scannedCompanies: activeCompanies.length,
      totalGenerated,
      totalDuplicatesPrevented,
    };
  }
}

