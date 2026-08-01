import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConducteurStatut, Prisma, VehiculeStatut, VoyageStatut } from '@prisma/client';

@Injectable()
export class VoyageResourceSyncService {
  /**
   * Returns true if status is considered active (EN_COURS)
   */
  isVoyageActiveStatus(statut: VoyageStatut): boolean {
    return statut === VoyageStatut.EN_COURS;
  }

  /**
   * Resolves driver by exact (case-insensitive) name match.
   * Throws 404 if not found, or 409 if multiple matches exist.
   */
  async resolveDriverByName(
    tx: Prisma.TransactionClient,
    nomConducteur: string,
  ): Promise<{ id: number; nomConducteur: string; statut: ConducteurStatut }> {
    const trimmedNom = nomConducteur.trim();
    const drivers = await tx.conducteur.findMany({
      where: { nomConducteur: { equals: trimmedNom, mode: 'insensitive' } },
    });

    if (drivers.length === 0) {
      throw new NotFoundException(`Le conducteur "${trimmedNom}" est introuvable`);
    }

    if (drivers.length > 1) {
      throw new ConflictException(
        `Plusieurs conducteurs correspondent à ce nom ("${trimmedNom}"). L’affectation doit être corrigée.`,
      );
    }

    return drivers[0];
  }

  /**
   * Validates resource eligibility and checks for active trip conflicts.
   */
  async validateActivationEligibility(
    tx: Prisma.TransactionClient,
    params: {
      idVoyageToExclude?: number;
      tracteurImmat?: string | null;
      remorqueImmat?: string | null;
      nomConducteur?: string | null;
    },
  ): Promise<{
    tracteur?: { id: number; immatriculation: string; statut: VehiculeStatut };
    remorque?: { id: number; immatriculation: string; statut: VehiculeStatut };
    driver?: { id: number; nomConducteur: string; statut: ConducteurStatut };
  }> {
    const { idVoyageToExclude, tracteurImmat, remorqueImmat, nomConducteur } = params;

    const trimmedTracteur = tracteurImmat ? tracteurImmat.trim() : null;
    const trimmedRemorque = remorqueImmat ? remorqueImmat.trim() : null;
    const trimmedDriver = nomConducteur ? nomConducteur.trim() : null;

    // 1. Cross-role check: Tractor and Trailer cannot be identical
    if (
      trimmedTracteur &&
      trimmedRemorque &&
      trimmedTracteur.toUpperCase() === trimmedRemorque.toUpperCase()
    ) {
      throw new ConflictException('Le tracteur et la remorque doivent être différents');
    }

    let tracteurVeh: { id: number; immatriculation: string; statut: VehiculeStatut } | undefined;
    let remorqueVeh: { id: number; immatriculation: string; statut: VehiculeStatut } | undefined;
    let driverObj: { id: number; nomConducteur: string; statut: ConducteurStatut } | undefined;

    // 2. Validate Tractor
    if (trimmedTracteur) {
      const veh = await tx.vehicule.findUnique({
        where: { immatriculation: trimmedTracteur },
      });
      if (!veh) {
        throw new NotFoundException(`Le véhicule tracteur "${trimmedTracteur}" est introuvable`);
      }

      if (veh.statut === VehiculeStatut.MAINTENANCE || veh.statut === VehiculeStatut.HORS_SERVICE) {
        throw new ConflictException('Ce véhicule n’est pas disponible pour démarrer ce voyage');
      }

      // Conflict check for active trip
      const activeConflict = await tx.voyage.findFirst({
        where: {
          statut: VoyageStatut.EN_COURS,
          ...(idVoyageToExclude ? { idVoyage: { not: idVoyageToExclude } } : {}),
          OR: [
            { tracteur: { equals: trimmedTracteur, mode: 'insensitive' } },
            { remorque: { equals: trimmedTracteur, mode: 'insensitive' } },
          ],
        },
      });

      if (activeConflict) {
        throw new ConflictException('Ce tracteur est déjà affecté à un voyage en cours');
      }

      tracteurVeh = veh;
    }

    // 3. Validate Trailer
    if (trimmedRemorque) {
      const veh = await tx.vehicule.findUnique({
        where: { immatriculation: trimmedRemorque },
      });
      if (!veh) {
        throw new NotFoundException(`Le véhicule remorque "${trimmedRemorque}" est introuvable`);
      }

      if (veh.statut === VehiculeStatut.MAINTENANCE || veh.statut === VehiculeStatut.HORS_SERVICE) {
        throw new ConflictException('Ce véhicule n’est pas disponible pour démarrer ce voyage');
      }

      // Conflict check for active trip
      const activeConflict = await tx.voyage.findFirst({
        where: {
          statut: VoyageStatut.EN_COURS,
          ...(idVoyageToExclude ? { idVoyage: { not: idVoyageToExclude } } : {}),
          OR: [
            { tracteur: { equals: trimmedRemorque, mode: 'insensitive' } },
            { remorque: { equals: trimmedRemorque, mode: 'insensitive' } },
          ],
        },
      });

      if (activeConflict) {
        throw new ConflictException('Cette remorque est déjà affectée à un voyage en cours');
      }

      remorqueVeh = veh;
    }

    // 4. Validate Driver
    if (trimmedDriver) {
      driverObj = await this.resolveDriverByName(tx, trimmedDriver);

      if (
        driverObj.statut === ConducteurStatut.INDISPONIBLE ||
        driverObj.statut === ConducteurStatut.INACTIF
      ) {
        throw new ConflictException('Ce conducteur n’est pas disponible pour démarrer ce voyage');
      }

      // Conflict check for active trip
      const activeConflict = await tx.voyage.findFirst({
        where: {
          statut: VoyageStatut.EN_COURS,
          ...(idVoyageToExclude ? { idVoyage: { not: idVoyageToExclude } } : {}),
          nomConducteur: { equals: driverObj.nomConducteur, mode: 'insensitive' },
        },
      });

      if (activeConflict) {
        throw new ConflictException('Ce conducteur est déjà affecté à un voyage en cours');
      }
    }

    return { tracteur: tracteurVeh, remorque: remorqueVeh, driver: driverObj };
  }

  /**
   * Sets resources to EN_VOYAGE for an activated voyage.
   */
  async acquireResources(
    tx: Prisma.TransactionClient,
    resources: {
      tracteurImmat?: string | null;
      remorqueImmat?: string | null;
      driverId?: number | null;
    },
  ): Promise<void> {
    const { tracteurImmat, remorqueImmat, driverId } = resources;

    if (tracteurImmat) {
      await tx.vehicule.update({
        where: { immatriculation: tracteurImmat },
        data: { statut: VehiculeStatut.EN_VOYAGE },
      });
    }

    if (remorqueImmat) {
      await tx.vehicule.update({
        where: { immatriculation: remorqueImmat },
        data: { statut: VehiculeStatut.EN_VOYAGE },
      });
    }

    if (driverId) {
      await tx.conducteur.update({
        where: { id: driverId },
        data: { statut: ConducteurStatut.EN_VOYAGE },
      });
    }
  }

  /**
   * Safely releases resources when leaving EN_COURS status.
   * Changes EN_VOYAGE -> DISPONIBLE if not assigned to another active trip
   * and not in a non-trip manual status (MAINTENANCE, HORS_SERVICE, INDISPONIBLE, INACTIF).
   */
  async releaseResources(
    tx: Prisma.TransactionClient,
    resources: {
      tracteurImmat?: string | null;
      remorqueImmat?: string | null;
      nomConducteur?: string | null;
      excludeVoyageId?: number;
    },
  ): Promise<void> {
    const { tracteurImmat, remorqueImmat, nomConducteur, excludeVoyageId } = resources;

    // Release Tractor
    if (tracteurImmat) {
      const trimmed = tracteurImmat.trim();
      const veh = await tx.vehicule.findUnique({ where: { immatriculation: trimmed } });
      if (veh && veh.statut === VehiculeStatut.EN_VOYAGE) {
        const remainingActive = await tx.voyage.findFirst({
          where: {
            statut: VoyageStatut.EN_COURS,
            ...(excludeVoyageId ? { idVoyage: { not: excludeVoyageId } } : {}),
            OR: [
              { tracteur: { equals: trimmed, mode: 'insensitive' } },
              { remorque: { equals: trimmed, mode: 'insensitive' } },
            ],
          },
        });
        if (!remainingActive) {
          await tx.vehicule.update({
            where: { id: veh.id },
            data: { statut: VehiculeStatut.DISPONIBLE },
          });
        }
      }
    }

    // Release Trailer
    if (remorqueImmat) {
      const trimmed = remorqueImmat.trim();
      const veh = await tx.vehicule.findUnique({ where: { immatriculation: trimmed } });
      if (veh && veh.statut === VehiculeStatut.EN_VOYAGE) {
        const remainingActive = await tx.voyage.findFirst({
          where: {
            statut: VoyageStatut.EN_COURS,
            ...(excludeVoyageId ? { idVoyage: { not: excludeVoyageId } } : {}),
            OR: [
              { tracteur: { equals: trimmed, mode: 'insensitive' } },
              { remorque: { equals: trimmed, mode: 'insensitive' } },
            ],
          },
        });
        if (!remainingActive) {
          await tx.vehicule.update({
            where: { id: veh.id },
            data: { statut: VehiculeStatut.DISPONIBLE },
          });
        }
      }
    }

    // Release Driver
    if (nomConducteur) {
      const trimmed = nomConducteur.trim();
      try {
        const driverObj = await this.resolveDriverByName(tx, trimmed);
        if (driverObj.statut === ConducteurStatut.EN_VOYAGE) {
          const remainingActive = await tx.voyage.findFirst({
            where: {
              statut: VoyageStatut.EN_COURS,
              ...(excludeVoyageId ? { idVoyage: { not: excludeVoyageId } } : {}),
              nomConducteur: { equals: driverObj.nomConducteur, mode: 'insensitive' },
            },
          });
          if (!remainingActive) {
            await tx.conducteur.update({
              where: { id: driverObj.id },
              data: { statut: ConducteurStatut.DISPONIBLE },
            });
          }
        }
      } catch (err) {
        // If driver was not found or ambiguous during release, ignore error on release
      }
    }
  }
}
