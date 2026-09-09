import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyStatut, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyProvisioningService } from '../company-provisioning/company-provisioning.service';
import { ProvisionCompanyDto } from '../company-provisioning/dto/provision-company.dto';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/paginated-result';

export interface PlatformCompanyListItem {
  id: number;
  nom: string;
  statut: CompanyStatut;
  creeLe: Date;
  misAJourLe: Date;
  usersCount: number;
  isConfigured: boolean;
}

export interface PlatformCompanyDetailView {
  id: number;
  nom: string;
  statut: CompanyStatut;
  creeLe: Date;
  misAJourLe: Date;
  usersCount: number;
  isConfigured: boolean;
  settingsSummary: {
    nomEntreprise: string | null;
    email: string | null;
    telephone: string | null;
    ville: string | null;
    ice: string | null;
  } | null;
}

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioningService: CompanyProvisioningService,
  ) {}

  async findAllCompanies(query: QueryCompaniesDto): Promise<PaginatedResult<PlatformCompanyListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.CompanyWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.search
        ? { nom: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };

    const [companies, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        include: {
          _count: { select: { users: true } },
          companySettings: { select: { nomEntreprise: true, adresse: true, telephone: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    const data: PlatformCompanyListItem[] = companies.map((c) => {
      const s = c.companySettings;
      const isConfigured = Boolean(
        s && s.nomEntreprise?.trim() && s.adresse?.trim() && s.telephone?.trim() && s.email?.trim(),
      );

      return {
        id: c.id,
        nom: c.nom,
        statut: c.statut,
        creeLe: c.creeLe,
        misAJourLe: c.misAJourLe,
        usersCount: c._count.users,
        isConfigured,
      };
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOneCompany(id: number): Promise<PlatformCompanyDetailView> {
    const c = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        companySettings: {
          select: {
            nomEntreprise: true,
            email: true,
            telephone: true,
            ville: true,
            ice: true,
            adresse: true,
          },
        },
      },
    });

    if (!c) {
      throw new NotFoundException(`Entreprise #${id} introuvable`);
    }

    const s = c.companySettings;
    const isConfigured = Boolean(
      s && s.nomEntreprise?.trim() && s.adresse?.trim() && s.telephone?.trim() && s.email?.trim(),
    );

    return {
      id: c.id,
      nom: c.nom,
      statut: c.statut,
      creeLe: c.creeLe,
      misAJourLe: c.misAJourLe,
      usersCount: c._count.users,
      isConfigured,
      settingsSummary: s
        ? {
            nomEntreprise: s.nomEntreprise,
            email: s.email,
            telephone: s.telephone,
            ville: s.ville,
            ice: s.ice,
          }
        : null,
    };
  }

  async provisionCompany(dto: ProvisionCompanyDto) {
    return this.provisioningService.provisionCompany(dto);
  }

  async updateCompanyStatus(id: number, dto: UpdateCompanyStatusDto): Promise<PlatformCompanyDetailView> {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Entreprise #${id} introuvable`);
    }

    const currentStatus = existing.statut;
    const targetStatus = dto.statut;

    if (currentStatus === targetStatus) {
      return this.findOneCompany(id);
    }

    // Validate approved transitions:
    // ACTIF -> SUSPENDU (ALLOWED)
    // ACTIF -> INACTIF (ALLOWED)
    // SUSPENDU -> ACTIF (ALLOWED)
    // INACTIF -> ACTIF (ALLOWED)
    // SUSPENDU -> INACTIF (REJECTED)
    // INACTIF -> SUSPENDU (REJECTED)
    const isAllowed =
      (currentStatus === 'ACTIF' && targetStatus === 'SUSPENDU') ||
      (currentStatus === 'ACTIF' && targetStatus === 'INACTIF') ||
      (currentStatus === 'SUSPENDU' && targetStatus === 'ACTIF') ||
      (currentStatus === 'INACTIF' && targetStatus === 'ACTIF');

    if (!isAllowed) {
      throw new BadRequestException(
        `Transition de statut non autorisée : impossible de passer de ${currentStatus} à ${targetStatus}`,
      );
    }

    await this.prisma.company.update({
      where: { id },
      data: { statut: targetStatus },
    });

    return this.findOneCompany(id);
  }
}
