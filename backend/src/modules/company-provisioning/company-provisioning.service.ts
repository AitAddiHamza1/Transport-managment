import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionCompanyDto } from './dto/provision-company.dto';

const SALT_ROUNDS = 10;

export interface ProvisionCompanyResult {
  company: {
    id: number;
    nom: string;
    statut: string;
  };
  admin: {
    id: number;
    nom: string;
    email: string;
    mustChangePassword: boolean;
  };
  temporaryPassword: string;
}

export function generateSecureTemporaryPassword(length = 14): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=';
  const all = uppers + lowers + numbers + symbols;

  const chars: string[] = [
    uppers[randomInt(0, uppers.length)],
    lowers[randomInt(0, lowers.length)],
    numbers[randomInt(0, numbers.length)],
    symbols[randomInt(0, symbols.length)],
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(all[randomInt(0, all.length)]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
}

@Injectable()
export class CompanyProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs controlled company provisioning inside a single atomic database transaction.
   */
  async provisionCompany(dto: ProvisionCompanyDto): Promise<ProvisionCompanyResult> {
    const companyName = dto.companyName?.trim();
    const adminName = dto.adminName?.trim();
    const adminEmail = dto.adminEmail?.trim().toLowerCase();

    if (!companyName || !adminName || !adminEmail) {
      throw new BadRequestException('Tous les champs (companyName, adminName, adminEmail) sont requis');
    }

    // 1. Check email uniqueness upfront
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(`L'e-mail « ${adminEmail} » est déjà utilisé par un autre compte.`);
    }

    // 2. Generate secure temporary password
    const temporaryPassword = generateSecureTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Find system role ADMIN_GENERAL (companyId = null)
        const adminRole = await tx.role.findFirst({
          where: { nom: 'ADMIN_GENERAL', companyId: null },
        });

        if (!adminRole) {
          throw new InternalServerErrorException(
            'Le rôle système « ADMIN_GENERAL » est introuvable dans la base de données. Assurez-vous d’avoir exécuté le seed.',
          );
        }

        // Create Company
        const company = await tx.company.create({
          data: {
            nom: companyName,
            statut: 'ACTIF',
          },
        });

        // Create CompanySettings
        await tx.companySettings.create({
          data: {
            companyId: company.id,
            nomEntreprise: companyName,
            tauxTvaParDefaut: 20.00,
            devise: 'MAD',
          },
        });

        // Create initial ADMIN_GENERAL user
        const adminUser = await tx.user.create({
          data: {
            companyId: company.id,
            nom: adminName,
            email: adminEmail,
            motDePasse: hashedPassword,
            idRole: adminRole.id,
            statut: 'ACTIF',
            mustChangePassword: true,
            permissions: Prisma.DbNull,
          },
        });

        return {
          company: {
            id: company.id,
            nom: company.nom,
            statut: company.statut,
          },
          admin: {
            id: adminUser.id,
            nom: adminUser.nom,
            email: adminUser.email,
            mustChangePassword: adminUser.mustChangePassword,
          },
          temporaryPassword,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`L'e-mail « ${adminEmail} » est déjà utilisé par un autre compte.`);
      }
      throw error;
    }
  }
}
