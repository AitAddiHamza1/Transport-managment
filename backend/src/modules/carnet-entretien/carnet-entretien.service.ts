import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, MaintenanceTriggerType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateMaintenanceRuleDto } from './dto/create-maintenance-rule.dto';
import { UpdateMaintenanceRuleDto } from './dto/update-maintenance-rule.dto';
import { CreateMaintenanceInterventionDto } from './dto/create-maintenance-intervention.dto';
import { UpdateMaintenanceInterventionDto } from './dto/update-maintenance-intervention.dto';
import { QueryCarnetEntretienDto } from './dto/query-carnet-entretien.dto';

export interface MaintenanceRuleView {
  id: number;
  companyId: number;
  code: string;
  nom: string;
  triggerType: MaintenanceTriggerType;
  intervalleKm: number | null;
  intervalleMois: number | null;
  seuilAlerteKm: number | null;
  seuilAlerteJours: number | null;
  description: string | null;
  creeLe: string;
}

export interface MaintenanceInterventionView {
  id: number;
  companyId: number;
  immatriculation: string;
  idRule: number | null;
  ruleCode: string | null;
  ruleNom: string | null;
  libelle: string;
  dateIntervention: string;
  kilometrageRealise: number;
  prochainKmEcheance: number | null;
  prochaineDateEcheance: string | null;
  currentVehicleMileage: number | null;
  remainingKm: number | null;
  remainingDays: number | null;
  statut: MaintenanceStatus;
  idDepenseVehicule: number | null;
  depenseMontant: number | null;
  depenseDate: string | null;
  notes: string | null;
  creeLe: string;
  misAJourLe: string;
}

export interface VehicleSituationView {
  immatriculation: string;
  currentMileage: number | null;
  statutGlobal: MaintenanceStatus;
  prochaineEcheanceKm: number | null;
  prochaineEcheanceDate: string | null;
  remainingKm: number | null;
  remainingDays: number | null;
  interventions: MaintenanceInterventionView[];
}

@Injectable()
export class CarnetEntretienService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // 1. Current Mileage Engine
  // -------------------------------------------------------------------
  /**
   * Computes authoritative current mileage for a vehicle derived from MAX(BonCarburant.kilometrage).
   */
  async getCurrentMileage(companyId: number, immatriculation: string): Promise<number | null> {
    const trimmed = immatriculation.trim();
    const result = await this.prisma.bonCarburant.aggregate({
      _max: {
        kilometrage: true,
      },
      where: {
        immatriculation: { equals: trimmed, mode: 'insensitive' },
        vehicule: { companyId },
      },
    });

    const maxKm = result._max.kilometrage;
    if (maxKm === null || maxKm === undefined) {
      return null;
    }

    if (maxKm > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException(`Kilométrage véhicule (${maxKm}) dépasse la limite JS`);
    }

    return Number(maxKm);
  }

  // -------------------------------------------------------------------
  // 2. Status Calculation Engine
  // -------------------------------------------------------------------
  public calculateStatus(params: {
    triggerType: MaintenanceTriggerType;
    currentMileage: number | null;
    prochainKmEcheance: number | null;
    prochaineDateEcheance: Date | null;
    seuilAlerteKm: number | null;
    seuilAlerteJours: number | null;
    referenceDate?: Date;
  }): MaintenanceStatus {
    const {
      triggerType,
      currentMileage,
      prochainKmEcheance,
      prochaineDateEcheance,
      seuilAlerteKm,
      seuilAlerteJours,
      referenceDate = new Date(),
    } = params;

    let kmStatus: MaintenanceStatus = MaintenanceStatus.OK;
    let dateStatus: MaintenanceStatus = MaintenanceStatus.OK;

    // Mileage evaluation
    if (prochainKmEcheance !== null && prochainKmEcheance !== undefined && currentMileage !== null && currentMileage !== undefined) {
      const remainingKm = prochainKmEcheance - currentMileage;
      if (remainingKm < 0) {
        kmStatus = MaintenanceStatus.OVERDUE;
      } else if (remainingKm === 0) {
        kmStatus = MaintenanceStatus.DUE;
      } else if (seuilAlerteKm !== null && seuilAlerteKm !== undefined && remainingKm <= seuilAlerteKm) {
        kmStatus = MaintenanceStatus.UPCOMING;
      } else {
        kmStatus = MaintenanceStatus.OK;
      }
    }

    // Date evaluation
    if (prochaineDateEcheance !== null && prochaineDateEcheance !== undefined) {
      const today = new Date(referenceDate);
      today.setHours(0, 0, 0, 0);

      const target = new Date(prochaineDateEcheance);
      target.setHours(0, 0, 0, 0);

      const diffMs = target.getTime() - today.getTime();
      const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (remainingDays < 0) {
        dateStatus = MaintenanceStatus.OVERDUE;
      } else if (remainingDays === 0) {
        dateStatus = MaintenanceStatus.DUE;
      } else if (seuilAlerteJours !== null && seuilAlerteJours !== undefined && remainingDays <= seuilAlerteJours) {
        dateStatus = MaintenanceStatus.UPCOMING;
      } else {
        dateStatus = MaintenanceStatus.OK;
      }
    }

    // Combine trigger logic
    if (triggerType === MaintenanceTriggerType.KILOMETRAGE) {
      return kmStatus;
    }

    if (triggerType === MaintenanceTriggerType.DATE) {
      return dateStatus;
    }

    // KILOMETRAGE_OU_DATE: worst status wins
    const statusPriority: Record<MaintenanceStatus, number> = {
      OVERDUE: 4,
      DUE: 3,
      UPCOMING: 2,
      OK: 1,
    };

    return statusPriority[kmStatus] >= statusPriority[dateStatus] ? kmStatus : dateStatus;
  }

  private toRuleView(rule: any): MaintenanceRuleView {
    return {
      id: rule.id,
      companyId: rule.companyId,
      code: rule.code,
      nom: rule.nom,
      triggerType: rule.triggerType,
      intervalleKm: rule.intervalleKm ?? null,
      intervalleMois: rule.intervalleMois ?? null,
      seuilAlerteKm: rule.seuilAlerteKm ?? null,
      seuilAlerteJours: rule.seuilAlerteJours ?? null,
      description: rule.description ?? null,
      creeLe: rule.creeLe ? new Date(rule.creeLe).toISOString() : new Date().toISOString(),
    };
  }

  private toInterventionView(
    intervention: any,
    currentMileage: number | null,
  ): MaintenanceInterventionView {
    const triggerType = intervention.rule?.triggerType ?? MaintenanceTriggerType.KILOMETRAGE;
    const seuilAlerteKm = intervention.rule?.seuilAlerteKm ?? null;
    const seuilAlerteJours = intervention.rule?.seuilAlerteJours ?? null;

    const prochaineDate = intervention.prochaineDateEcheance
      ? new Date(intervention.prochaineDateEcheance)
      : null;

    const computedStatus = this.calculateStatus({
      triggerType,
      currentMileage,
      prochainKmEcheance: intervention.prochainKmEcheance,
      prochaineDateEcheance: prochaineDate,
      seuilAlerteKm,
      seuilAlerteJours,
    });

    const remainingKm =
      intervention.prochainKmEcheance !== null && intervention.prochainKmEcheance !== undefined && currentMileage !== null
        ? intervention.prochainKmEcheance - currentMileage
        : null;

    let remainingDays: number | null = null;
    if (prochaineDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(prochaineDate);
      target.setHours(0, 0, 0, 0);
      remainingDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: intervention.id,
      companyId: intervention.companyId,
      immatriculation: intervention.immatriculation,
      idRule: intervention.idRule ?? null,
      ruleCode: intervention.rule?.code ?? null,
      ruleNom: intervention.rule?.nom ?? null,
      libelle: intervention.libelle,
      dateIntervention: intervention.dateIntervention
        ? new Date(intervention.dateIntervention).toISOString().substring(0, 10)
        : '',
      kilometrageRealise: intervention.kilometrageRealise,
      prochainKmEcheance: intervention.prochainKmEcheance ?? null,
      prochaineDateEcheance: prochaineDate
        ? prochaineDate.toISOString().substring(0, 10)
        : null,
      currentVehicleMileage: currentMileage,
      remainingKm,
      remainingDays,
      statut: computedStatus,
      idDepenseVehicule: intervention.idDepenseVehicule ?? null,
      depenseMontant: intervention.depenseVehicule?.montant
        ? Number(intervention.depenseVehicule.montant)
        : null,
      depenseDate: intervention.depenseVehicule?.dateDepense
        ? new Date(intervention.depenseVehicule.dateDepense).toISOString().substring(0, 10)
        : null,
      notes: intervention.notes ?? null,
      creeLe: intervention.creeLe ? new Date(intervention.creeLe).toISOString() : new Date().toISOString(),
      misAJourLe: intervention.misAJourLe
        ? new Date(intervention.misAJourLe).toISOString()
        : new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------
  // 3. Maintenance Rules CRUD
  // -------------------------------------------------------------------
  async createRule(companyId: number, dto: CreateMaintenanceRuleDto): Promise<MaintenanceRuleView> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.maintenanceRule.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Une règle d’entretien avec le code "${code}" existe déjà`);
    }

    const created = await this.prisma.maintenanceRule.create({
      data: {
        companyId,
        code,
        nom: dto.nom.trim(),
        triggerType: dto.triggerType ?? MaintenanceTriggerType.KILOMETRAGE,
        intervalleKm: dto.intervalleKm ?? null,
        intervalleMois: dto.intervalleMois ?? null,
        seuilAlerteKm: dto.seuilAlerteKm ?? null,
        seuilAlerteJours: dto.seuilAlerteJours ?? null,
        description: dto.description ? dto.description.trim() : null,
      },
    });

    return this.toRuleView(created);
  }

  async findAllRules(companyId: number): Promise<MaintenanceRuleView[]> {
    const rules = await this.prisma.maintenanceRule.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
    });
    return rules.map((r) => this.toRuleView(r));
  }

  async findOneRule(companyId: number, id: number): Promise<MaintenanceRuleView> {
    const rule = await this.prisma.maintenanceRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) {
      throw new NotFoundException(`Règle d’entretien #${id} introuvable`);
    }
    return this.toRuleView(rule);
  }

  async updateRule(
    companyId: number,
    id: number,
    dto: UpdateMaintenanceRuleDto,
  ): Promise<MaintenanceRuleView> {
    const existing = await this.prisma.maintenanceRule.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException(`Règle d’entretien #${id} introuvable`);
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const targetCode = dto.code.trim().toUpperCase();
      const codeDuplicate = await this.prisma.maintenanceRule.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: targetCode,
          },
        },
      });
      if (codeDuplicate) {
        throw new ConflictException(`Une règle d’entretien avec le code "${targetCode}" existe déjà`);
      }
    }

    const updated = await this.prisma.maintenanceRule.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.nom ? { nom: dto.nom.trim() } : {}),
        ...(dto.triggerType !== undefined ? { triggerType: dto.triggerType } : {}),
        ...(dto.intervalleKm !== undefined ? { intervalleKm: dto.intervalleKm } : {}),
        ...(dto.intervalleMois !== undefined ? { intervalleMois: dto.intervalleMois } : {}),
        ...(dto.seuilAlerteKm !== undefined ? { seuilAlerteKm: dto.seuilAlerteKm } : {}),
        ...(dto.seuilAlerteJours !== undefined ? { seuilAlerteJours: dto.seuilAlerteJours } : {}),
        ...(dto.description !== undefined ? { description: dto.description ? dto.description.trim() : null } : {}),
      },
    });

    return this.toRuleView(updated);
  }

  async removeRule(companyId: number, id: number): Promise<{ id: number }> {
    const existing = await this.prisma.maintenanceRule.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException(`Règle d’entretien #${id} introuvable`);
    }

    await this.prisma.maintenanceRule.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------
  // 4. Maintenance Interventions CRUD & Queries
  // -------------------------------------------------------------------
  async createIntervention(
    companyId: number,
    dto: CreateMaintenanceInterventionDto,
  ): Promise<MaintenanceInterventionView> {
    const immatriculation = dto.immatriculation.trim().toUpperCase();

    // 1. Verify vehicle exists for current tenant
    const vehicule = await this.prisma.vehicule.findFirst({
      where: { immatriculation, companyId },
    });
    if (!vehicule) {
      throw new NotFoundException(`Véhicule avec immatriculation "${immatriculation}" introuvable`);
    }

    // 2. Verify rule if provided
    let rule: any = null;
    if (dto.idRule) {
      rule = await this.prisma.maintenanceRule.findFirst({
        where: { id: dto.idRule, companyId },
      });
      if (!rule) {
        throw new NotFoundException(`Règle d’entretien #${dto.idRule} introuvable`);
      }
    }

    // 3. Verify DepenseVehicule if provided
    if (dto.idDepenseVehicule) {
      const depense = await this.prisma.depenseVehicule.findFirst({
        where: { idDepense: dto.idDepenseVehicule, vehicule: { companyId } },
      });
      if (!depense) {
        throw new NotFoundException(`Dépense véhicule #${dto.idDepenseVehicule} introuvable`);
      }

      // Check unique intervention per charge
      const existingLink = await this.prisma.maintenanceIntervention.findUnique({
        where: { idDepenseVehicule: dto.idDepenseVehicule },
      });
      if (existingLink) {
        throw new ConflictException(
          `La dépense véhicule #${dto.idDepenseVehicule} est déjà liée à une intervention d’entretien (#${existingLink.id})`,
        );
      }
    }

    // Auto-calculate next due km if rule intervalleKm present and not passed explicitly
    let prochainKmEcheance = dto.prochainKmEcheance ?? null;
    if (prochainKmEcheance === null && rule && rule.intervalleKm) {
      prochainKmEcheance = dto.kilometrageRealise + rule.intervalleKm;
    }

    // Auto-calculate next due date if rule intervalleMois present and not passed explicitly
    let prochaineDateEcheance: Date | null = dto.prochaineDateEcheance
      ? new Date(dto.prochaineDateEcheance)
      : null;
    if (!prochaineDateEcheance && rule && rule.intervalleMois) {
      const baseDate = new Date(dto.dateIntervention);
      baseDate.setMonth(baseDate.getMonth() + rule.intervalleMois);
      prochaineDateEcheance = baseDate;
    }

    const currentMileage = await this.getCurrentMileage(companyId, immatriculation);
    const triggerType = rule?.triggerType ?? MaintenanceTriggerType.KILOMETRAGE;

    const initialStatus = this.calculateStatus({
      triggerType,
      currentMileage,
      prochainKmEcheance,
      prochaineDateEcheance,
      seuilAlerteKm: rule?.seuilAlerteKm ?? null,
      seuilAlerteJours: rule?.seuilAlerteJours ?? null,
    });

    const created = await this.prisma.maintenanceIntervention.create({
      data: {
        companyId,
        immatriculation,
        idRule: dto.idRule ?? null,
        libelle: dto.libelle.trim(),
        dateIntervention: new Date(dto.dateIntervention),
        kilometrageRealise: dto.kilometrageRealise,
        prochainKmEcheance,
        prochaineDateEcheance,
        statut: initialStatus,
        idDepenseVehicule: dto.idDepenseVehicule ?? null,
        notes: dto.notes ? dto.notes.trim() : null,
      },
      include: {
        rule: true,
        depenseVehicule: true,
      },
    });

    return this.toInterventionView(created, currentMileage);
  }

  async findAllInterventions(
    companyId: number,
    query: QueryCarnetEntretienDto,
  ): Promise<PaginatedResult<MaintenanceInterventionView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const where: Prisma.MaintenanceInterventionWhereInput = {
      companyId,
    };

    if (query.immatriculation) {
      where.immatriculation = {
        contains: query.immatriculation.trim(),
        mode: 'insensitive',
      };
    }

    if (query.idRule) {
      where.idRule = query.idRule;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { libelle: { contains: s, mode: 'insensitive' } },
        { immatriculation: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.dateIntervention = {};
      if (query.dateFrom) where.dateIntervention.gte = new Date(query.dateFrom);
      if (query.dateTo) where.dateIntervention.lte = new Date(query.dateTo);
    }

    const rawInterventions = await this.prisma.maintenanceIntervention.findMany({
      where,
      include: {
        rule: true,
        depenseVehicule: true,
      },
      orderBy: { [query.sortBy ?? 'dateIntervention']: query.sortOrder ?? 'desc' },
    });

    // Fetch unique vehicles' current mileage
    const uniqueImmatriculations = Array.from(new Set(rawInterventions.map((i) => i.immatriculation)));
    const mileageMap = new Map<string, number | null>();

    await Promise.all(
      uniqueImmatriculations.map(async (immat) => {
        const km = await this.getCurrentMileage(companyId, immat);
        mileageMap.set(immat, km);
      }),
    );

    let views = rawInterventions.map((item) => {
      const km = mileageMap.get(item.immatriculation) ?? null;
      return this.toInterventionView(item, km);
    });

    // Post-filter by dynamically calculated status if requested
    if (query.statut) {
      views = views.filter((v) => v.statut === query.statut);
    }

    const total = views.length;
    const paginated = views.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOneIntervention(
    companyId: number,
    id: number,
  ): Promise<MaintenanceInterventionView> {
    const intervention = await this.prisma.maintenanceIntervention.findFirst({
      where: { id, companyId },
      include: {
        rule: true,
        depenseVehicule: true,
      },
    });

    if (!intervention) {
      throw new NotFoundException(`Intervention d’entretien #${id} introuvable`);
    }

    const currentMileage = await this.getCurrentMileage(companyId, intervention.immatriculation);
    return this.toInterventionView(intervention, currentMileage);
  }

  async updateIntervention(
    companyId: number,
    id: number,
    dto: UpdateMaintenanceInterventionDto,
  ): Promise<MaintenanceInterventionView> {
    const existing = await this.prisma.maintenanceIntervention.findFirst({
      where: { id, companyId },
      include: { rule: true },
    });
    if (!existing) {
      throw new NotFoundException(`Intervention d’entretien #${id} introuvable`);
    }

    const targetImmatriculation = dto.immatriculation
      ? dto.immatriculation.trim().toUpperCase()
      : existing.immatriculation;

    if (dto.immatriculation && targetImmatriculation !== existing.immatriculation) {
      const vehicule = await this.prisma.vehicule.findFirst({
        where: { immatriculation: targetImmatriculation, companyId },
      });
      if (!vehicule) {
        throw new NotFoundException(
          `Véhicule avec immatriculation "${targetImmatriculation}" introuvable`,
        );
      }
    }

    let rule = existing.rule;
    if (dto.idRule !== undefined && dto.idRule !== existing.idRule) {
      if (dto.idRule) {
        rule = await this.prisma.maintenanceRule.findFirst({
          where: { id: dto.idRule, companyId },
        });
        if (!rule) {
          throw new NotFoundException(`Règle d’entretien #${dto.idRule} introuvable`);
        }
      } else {
        rule = null;
      }
    }

    if (dto.idDepenseVehicule !== undefined && dto.idDepenseVehicule !== existing.idDepenseVehicule) {
      if (dto.idDepenseVehicule) {
        const depense = await this.prisma.depenseVehicule.findFirst({
          where: { idDepense: dto.idDepenseVehicule, vehicule: { companyId } },
        });
        if (!depense) {
          throw new NotFoundException(`Dépense véhicule #${dto.idDepenseVehicule} introuvable`);
        }

        const existingLink = await this.prisma.maintenanceIntervention.findUnique({
          where: { idDepenseVehicule: dto.idDepenseVehicule },
        });
        if (existingLink && existingLink.id !== id) {
          throw new ConflictException(
            `La dépense véhicule #${dto.idDepenseVehicule} est déjà liée à une intervention (#${existingLink.id})`,
          );
        }
      }
    }

    const updated = await this.prisma.maintenanceIntervention.update({
      where: { id },
      data: {
        ...(dto.immatriculation ? { immatriculation: targetImmatriculation } : {}),
        ...(dto.idRule !== undefined ? { idRule: dto.idRule } : {}),
        ...(dto.libelle ? { libelle: dto.libelle.trim() } : {}),
        ...(dto.dateIntervention ? { dateIntervention: new Date(dto.dateIntervention) } : {}),
        ...(dto.kilometrageRealise !== undefined ? { kilometrageRealise: dto.kilometrageRealise } : {}),
        ...(dto.prochainKmEcheance !== undefined ? { prochainKmEcheance: dto.prochainKmEcheance } : {}),
        ...(dto.prochaineDateEcheance !== undefined
          ? {
              prochaineDateEcheance: dto.prochaineDateEcheance
                ? new Date(dto.prochaineDateEcheance)
                : null,
            }
          : {}),
        ...(dto.idDepenseVehicule !== undefined ? { idDepenseVehicule: dto.idDepenseVehicule } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ? dto.notes.trim() : null } : {}),
      },
      include: {
        rule: true,
        depenseVehicule: true,
      },
    });

    const currentMileage = await this.getCurrentMileage(companyId, targetImmatriculation);
    return this.toInterventionView(updated, currentMileage);
  }

  async removeIntervention(companyId: number, id: number): Promise<{ id: number }> {
    const existing = await this.prisma.maintenanceIntervention.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException(`Intervention d’entretien #${id} introuvable`);
    }

    await this.prisma.maintenanceIntervention.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------
  // 5. Vehicle Maintenance Situation Engine
  // -------------------------------------------------------------------
  async getVehicleSituation(
    companyId: number,
    immatriculation: string,
  ): Promise<VehicleSituationView> {
    const targetImmat = immatriculation.trim().toUpperCase();
    const vehicule = await this.prisma.vehicule.findFirst({
      where: { immatriculation: targetImmat, companyId },
    });
    if (!vehicule) {
      throw new NotFoundException(`Véhicule avec immatriculation "${targetImmat}" introuvable`);
    }

    const currentMileage = await this.getCurrentMileage(companyId, targetImmat);

    const rawInterventions = await this.prisma.maintenanceIntervention.findMany({
      where: { companyId, immatriculation: targetImmat },
      include: {
        rule: true,
        depenseVehicule: true,
      },
      orderBy: { dateIntervention: 'desc' },
    });

    const views = rawInterventions.map((i) => this.toInterventionView(i, currentMileage));

    // Determine global status and nearest upcoming/overdue maintenance
    const statusPriority: Record<MaintenanceStatus, number> = {
      OVERDUE: 4,
      DUE: 3,
      UPCOMING: 2,
      OK: 1,
    };

    let statutGlobal: MaintenanceStatus = MaintenanceStatus.OK;
    let nearestProchaineKm: number | null = null;
    let nearestProchaineDate: string | null = null;
    let smallestRemainingKm: number | null = null;
    let smallestRemainingDays: number | null = null;

    for (const v of views) {
      if (statusPriority[v.statut] > statusPriority[statutGlobal]) {
        statutGlobal = v.statut;
      }

      if (v.prochainKmEcheance !== null && v.remainingKm !== null) {
        if (smallestRemainingKm === null || v.remainingKm < smallestRemainingKm) {
          smallestRemainingKm = v.remainingKm;
          nearestProchaineKm = v.prochainKmEcheance;
        }
      }

      if (v.prochaineDateEcheance !== null && v.remainingDays !== null) {
        if (smallestRemainingDays === null || v.remainingDays < smallestRemainingDays) {
          smallestRemainingDays = v.remainingDays;
          nearestProchaineDate = v.prochaineDateEcheance;
        }
      }
    }

    return {
      immatriculation: targetImmat,
      currentMileage,
      statutGlobal,
      prochaineEcheanceKm: nearestProchaineKm,
      prochaineEcheanceDate: nearestProchaineDate,
      remainingKm: smallestRemainingKm,
      remainingDays: smallestRemainingDays,
      interventions: views,
    };
  }
}
