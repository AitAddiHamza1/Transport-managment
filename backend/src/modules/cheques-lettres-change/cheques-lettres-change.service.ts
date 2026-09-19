import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatutInstrumentBancaire } from '@prisma/client';
import {
  QueryChequesLettresChangeDto,
  InstrumentType,
  InstrumentSource,
} from './dto/query-cheques-lettres-change.dto';
import { UpdateStatutInstrumentDto } from './dto/update-statut-instrument.dto';
import { PaginatedResult, buildPaginationMeta } from '../../common/dto/paginated-result';

export interface PaymentInstrumentView {
  id: number;
  instrumentType: 'CHEQUE' | 'LETTRE_DE_CHANGE';
  source: 'CLIENT' | 'FOURNISSEUR';
  direction: 'IN' | 'OUT';
  numero: string;
  date: string;
  dateEcheance: string | null;
  montant: number;
  devise: string;
  beneficiaire: string;
  banque: string | null;
  agence: string | null;
  ville: string | null;
  serie: string | null;
  cause: string | null;
  tireNom: string | null;
  tireAdresse: string | null;
  partyName: string;
  partyType: 'CLIENT' | 'FOURNISSEUR';
  paymentId: number;
  paymentReference: string;
  statutBancaire: StatutInstrumentBancaire;
  isPaymentCancelled: boolean;
  hasDocument: boolean;
  fileUrl: string | null;
  downloadUrl: string | null;
}

export interface InstrumentStatsView {
  totalChequesCount: number;
  totalChequesAmountByCurrency: Record<string, number>;
  totalLettresCount: number;
  totalLettresAmountByCurrency: Record<string, number>;
  byStatusCount: Record<string, number>;
  bySourceCount: Record<string, number>;
}

@Injectable()
export class ChequesLettresChangeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch tenant-isolated Cheques
   */
  private async getTenantCheques(companyId: number) {
    const cheques = await this.prisma.cheque.findMany({
      include: {
        paiementClient: {
          include: {
            facture: true,
          },
        },
        paiementFournisseur: {
          include: {
            detteFournisseur: true,
          },
        },
      },
    });

    // Filter by tenant
    return cheques.filter((c) => {
      if (c.idPaiementClient && c.paiementClient?.facture) {
        return c.paiementClient.facture.companyId === companyId && !c.paiementClient.facture.supprimeLe;
      }
      if (c.idPaiementFournisseur && c.paiementFournisseur?.detteFournisseur) {
        return c.paiementFournisseur.detteFournisseur.companyId === companyId && !c.paiementFournisseur.detteFournisseur.supprimeLe;
      }
      return false;
    });
  }

  /**
   * Helper to fetch tenant-isolated Lettres de Change
   */
  private async getTenantLettres(companyId: number) {
    const lettres = await this.prisma.lettreDeChange.findMany({
      include: {
        paiementClient: {
          include: {
            facture: true,
          },
        },
        paiementFournisseur: {
          include: {
            detteFournisseur: true,
          },
        },
      },
    });

    // Filter by tenant
    return lettres.filter((l) => {
      if (l.idPaiementClient && l.paiementClient?.facture) {
        return l.paiementClient.facture.companyId === companyId && !l.paiementClient.facture.supprimeLe;
      }
      if (l.idPaiementFournisseur && l.paiementFournisseur?.detteFournisseur) {
        return l.paiementFournisseur.detteFournisseur.companyId === companyId && !l.paiementFournisseur.detteFournisseur.supprimeLe;
      }
      return false;
    });
  }

  private mapChequeToView(c: any): PaymentInstrumentView {
    const isClient = Boolean(c.idPaiementClient);
    const pc = c.paiementClient;
    const pf = c.paiementFournisseur;

    const source: 'CLIENT' | 'FOURNISSEUR' = isClient ? 'CLIENT' : 'FOURNISSEUR';
    const direction: 'IN' | 'OUT' = isClient ? 'IN' : 'OUT';
    const partyName = isClient
      ? pc?.nomClient || pc?.facture?.nomClient || 'Client'
      : pf?.detteFournisseur?.nomFournisseurSnapshot || 'Fournisseur';

    const montant = isClient ? Number(pc?.montantRecu || 0) : Number(pf?.montant || 0);
    const devise = isClient ? pc?.devise || pc?.facture?.devise || 'MAD' : 'MAD';
    const paymentId = isClient ? c.idPaiementClient! : c.idPaiementFournisseur!;
    const paymentReference = isClient
      ? `PC-${pc?.numeroFacture || pc?.id}`
      : pf?.numeroPaiement || `PF-${pf?.id}`;

    const isPaymentCancelled = isClient ? false : Boolean(pf?.estAnnule);

    return {
      id: c.id,
      instrumentType: 'CHEQUE',
      source,
      direction,
      numero: c.numero,
      date: c.dateCheque ? new Date(c.dateCheque).toISOString().split('T')[0] : '',
      dateEcheance: null,
      montant,
      devise,
      beneficiaire: c.beneficiaire,
      banque: c.banque || null,
      agence: c.agence || null,
      ville: c.ville || null,
      serie: c.serie || null,
      cause: null,
      tireNom: null,
      tireAdresse: null,
      partyName,
      partyType: source,
      paymentId,
      paymentReference,
      statutBancaire: isPaymentCancelled ? StatutInstrumentBancaire.ANNULE : (c.statutBancaire || StatutInstrumentBancaire.EN_PORTEFEUILLE),
      isPaymentCancelled,
      hasDocument: Boolean(c.cheminFichier),
      fileUrl: c.cheminFichier ? `/api/cheques/${c.id}/document/fichier` : null,
      downloadUrl: c.cheminFichier ? `/api/cheques/${c.id}/document/download` : null,
    };
  }

  private mapLettreToView(l: any): PaymentInstrumentView {
    const isClient = Boolean(l.idPaiementClient);
    const pc = l.paiementClient;
    const pf = l.paiementFournisseur;

    const source: 'CLIENT' | 'FOURNISSEUR' = isClient ? 'CLIENT' : 'FOURNISSEUR';
    const direction: 'IN' | 'OUT' = isClient ? 'IN' : 'OUT';
    const partyName = isClient
      ? pc?.nomClient || pc?.facture?.nomClient || 'Client'
      : pf?.detteFournisseur?.nomFournisseurSnapshot || 'Fournisseur';

    const montant = Number(l.montant || 0);
    const devise = isClient ? pc?.devise || pc?.facture?.devise || 'MAD' : 'MAD';
    const paymentId = isClient ? l.idPaiementClient! : l.idPaiementFournisseur!;
    const paymentReference = isClient
      ? `PC-${pc?.numeroFacture || pc?.id}`
      : pf?.numeroPaiement || `PF-${pf?.id}`;

    const isPaymentCancelled = isClient ? false : Boolean(pf?.estAnnule);

    return {
      id: l.id,
      instrumentType: 'LETTRE_DE_CHANGE',
      source,
      direction,
      numero: l.numero,
      date: l.dateEcheance ? new Date(l.dateEcheance).toISOString().split('T')[0] : '',
      dateEcheance: l.dateEcheance ? new Date(l.dateEcheance).toISOString().split('T')[0] : null,
      montant,
      devise,
      beneficiaire: l.beneficiaire,
      banque: null,
      agence: null,
      ville: null,
      serie: null,
      cause: l.cause || null,
      tireNom: l.tireNom || null,
      tireAdresse: l.tireAdresse || null,
      partyName,
      partyType: source,
      paymentId,
      paymentReference,
      statutBancaire: isPaymentCancelled ? StatutInstrumentBancaire.ANNULE : (l.statutBancaire || StatutInstrumentBancaire.EN_PORTEFEUILLE),
      isPaymentCancelled,
      hasDocument: Boolean(l.cheminFichier),
      fileUrl: l.cheminFichier ? `/api/lettres-de-change/${l.id}/document/fichier` : null,
      downloadUrl: l.cheminFichier ? `/api/lettres-de-change/${l.id}/document/download` : null,
    };
  }

  async findAll(
    companyId: number,
    query: QueryChequesLettresChangeDto,
  ): Promise<PaginatedResult<PaymentInstrumentView>> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    let items: PaymentInstrumentView[] = [];

    // Fetch cheques if requested or all
    if (!query.type || query.type === InstrumentType.CHEQUE) {
      const rawCheques = await this.getTenantCheques(companyId);
      items.push(...rawCheques.map((c) => this.mapChequeToView(c)));
    }

    // Fetch lettres de change if requested or all
    if (!query.type || query.type === InstrumentType.LETTRE_DE_CHANGE) {
      const rawLettres = await this.getTenantLettres(companyId);
      items.push(...rawLettres.map((l) => this.mapLettreToView(l)));
    }

    // Filter by Source (CLIENT / FOURNISSEUR)
    if (query.source) {
      items = items.filter((item) => item.source === query.source);
    }

    // Filter by Statut Bancaire
    if (query.statutBancaire) {
      items = items.filter((item) => item.statutBancaire === query.statutBancaire);
    }

    // Filter by Search Text
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.numero.toLowerCase().includes(s) ||
          item.beneficiaire.toLowerCase().includes(s) ||
          item.partyName.toLowerCase().includes(s) ||
          item.paymentReference.toLowerCase().includes(s) ||
          (item.banque && item.banque.toLowerCase().includes(s)) ||
          (item.tireNom && item.tireNom.toLowerCase().includes(s)) ||
          (item.serie && item.serie.toLowerCase().includes(s)),
      );
    }

    // Filter by Date Range
    if (query.dateDebut) {
      const startDate = new Date(query.dateDebut);
      items = items.filter((item) => new Date(item.date) >= startDate);
    }
    if (query.dateFin) {
      const endDate = new Date(query.dateFin);
      items = items.filter((item) => new Date(item.date) <= endDate);
    }

    // Sort items
    const sortBy = query.sortBy || 'date';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    items.sort((a, b) => {
      let valA: any = a[sortBy as keyof PaymentInstrumentView] || a.date;
      let valB: any = b[sortBy as keyof PaymentInstrumentView] || b.date;

      if (sortBy === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = items.length;
    const offset = (page - 1) * limit;
    const paginatedData = items.slice(offset, offset + limit);

    return {
      data: paginatedData,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(
    companyId: number,
    query: QueryChequesLettresChangeDto,
  ): Promise<InstrumentStatsView> {
    const rawCheques = await this.getTenantCheques(companyId);
    const rawLettres = await this.getTenantLettres(companyId);

    const cheques = rawCheques.map((c) => this.mapChequeToView(c));
    const lettres = rawLettres.map((l) => this.mapLettreToView(l));

    let all = [...cheques, ...lettres];

    if (query.source) {
      all = all.filter((i) => i.source === query.source);
    }

    const totalChequesCount = cheques.length;
    const totalLettresCount = lettres.length;

    const totalChequesAmountByCurrency: Record<string, number> = {};
    for (const c of cheques) {
      if (!c.isPaymentCancelled) {
        const cur = c.devise || 'MAD';
        totalChequesAmountByCurrency[cur] = (totalChequesAmountByCurrency[cur] || 0) + c.montant;
      }
    }

    const totalLettresAmountByCurrency: Record<string, number> = {};
    for (const l of lettres) {
      if (!l.isPaymentCancelled) {
        const cur = l.devise || 'MAD';
        totalLettresAmountByCurrency[cur] = (totalLettresAmountByCurrency[cur] || 0) + l.montant;
      }
    }

    const byStatusCount: Record<string, number> = {
      EN_PORTEFEUILLE: 0,
      DEPOSE_EN_BANQUE: 0,
      ENCAISSE: 0,
      REJETE_IMPAYE: 0,
      ANNULE: 0,
    };

    const bySourceCount: Record<string, number> = {
      CLIENT: 0,
      FOURNISSEUR: 0,
    };

    for (const item of all) {
      byStatusCount[item.statutBancaire] = (byStatusCount[item.statutBancaire] || 0) + 1;
      bySourceCount[item.source] = (bySourceCount[item.source] || 0) + 1;
    }

    return {
      totalChequesCount,
      totalChequesAmountByCurrency,
      totalLettresCount,
      totalLettresAmountByCurrency,
      byStatusCount,
      bySourceCount,
    };
  }

  /**
   * Update Cheque Banking Status with Tenant Verification
   * GUARANTEE: DOES NOT CREATE ANY SECOND PAYMENT OR FINANCIAL TRANSACTION.
   */
  async updateStatutCheque(
    companyId: number,
    id: number,
    dto: UpdateStatutInstrumentDto,
  ): Promise<PaymentInstrumentView> {
    const rawCheques = await this.getTenantCheques(companyId);
    const match = rawCheques.find((c) => c.id === id);

    if (!match) {
      throw new NotFoundException(`Chèque #${id} introuvable pour cette entreprise`);
    }

    const updated = await this.prisma.cheque.update({
      where: { id },
      data: {
        statutBancaire: dto.statutBancaire,
      },
      include: {
        paiementClient: { include: { facture: true } },
        paiementFournisseur: { include: { detteFournisseur: true } },
      },
    });

    return this.mapChequeToView(updated);
  }

  /**
   * Update Lettre de Change Banking Status with Tenant Verification
   * GUARANTEE: DOES NOT CREATE ANY SECOND PAYMENT OR FINANCIAL TRANSACTION.
   */
  async updateStatutLettre(
    companyId: number,
    id: number,
    dto: UpdateStatutInstrumentDto,
  ): Promise<PaymentInstrumentView> {
    const rawLettres = await this.getTenantLettres(companyId);
    const match = rawLettres.find((l) => l.id === id);

    if (!match) {
      throw new NotFoundException(`Lettre de change #${id} introuvable pour cette entreprise`);
    }

    const updated = await this.prisma.lettreDeChange.update({
      where: { id },
      data: {
        statutBancaire: dto.statutBancaire,
      },
      include: {
        paiementClient: { include: { facture: true } },
        paiementFournisseur: { include: { detteFournisseur: true } },
      },
    });

    return this.mapLettreToView(updated);
  }
}
