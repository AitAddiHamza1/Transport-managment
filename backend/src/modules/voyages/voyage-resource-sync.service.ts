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
   * Resolves driver by exact (case-insensitive) name match within tenant.
   * Throws 404 if not found, or 409 if multiple matches exist.
   */
  async resolveDriverByName(
    tx: Prisma.TransactionClient,
    nomConducteur: string,
    companyId: number,
  ): Promise<{ id: number; nomConducteur: string; statut: ConducteurStatut; employe: any }> {
    const trimmedNom = nomConducteur.trim();
    const drivers = await tx.conducteur.findMany({
      where: {
        companyId,
        nomConducteur: { equals: trimmedNom, mode: 'insensitive' },
      },
      include: { employe: true },
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
   * Validates resource eligibility and checks for active trip conflicts within tenant.
   */
  async validateActivationEligibility(
    tx: Prisma.TransactionClient,
    params: {
      idVoyageToExclude?: number;
      tracteurImmat?: string | null;
      remorqueImmat?: string | null;
      nomConducteur?: string | null;
    },
    companyId: number,
  ): Promise<{
    tracteur?: { id: number; immatriculation: string; statut: VehiculeStatut };
    remorque?: { id: number; immatriculation: string; statut: VehiculeStatut };
    driver?: { id: number; nomConducteur: string; statut: ConducteurStatut; employe?: any };
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
    let driverObj:
      { id: number; nomConducteur: string; statut: ConducteurStatut; employe?: any } | undefined;

    // 2. Validate Tractor
    if (trimmedTracteur) {
      const veh = await tx.vehicule.findFirst({
        where: {
          companyId,
          immatriculation: { equals: trimmedTracteur, mode: 'insensitive' },
        },
      });
      if (!veh) {
        throw new NotFoundException(`Le véhicule tracteur "${trimmedTracteur}" est introuvable`);
      }

      if (veh.statut === VehiculeStatut.MAINTENANCE || veh.statut === VehiculeStatut.HORS_SERVICE) {
        throw new ConflictException('Ce véhicule n’est pas disponible pour démarrer ce voyage');
      }

      // Conflict check for active trip within same tenant
      const activeConflict = await tx.voyage.findFirst({
        where: {
          companyId,
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
      const veh = await tx.vehicule.findFirst({
        where: {
          companyId,
          immatriculation: { equals: trimmedRemorque, mode: 'insensitive' },
        },
      });
      if (!veh) {
        throw new NotFoundException(`Le véhicule remorque "${trimmedRemorque}" est introuvable`);
      }

      if (veh.statut === VehiculeStatut.MAINTENANCE || veh.statut === VehiculeStatut.HORS_SERVICE) {
        throw new ConflictException('Ce véhicule n’est pas disponible pour démarrer ce voyage');
      }

      // Conflict check for active trip within same tenant
      const activeConflict = await tx.voyage.findFirst({
        where: {
          companyId,
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
      driverObj = await this.resolveDriverByName(tx, trimmedDriver, companyId);

      if (!driverObj.employe || driverObj.employe.supprimeLe) {
        throw new ConflictException(
          'Ce conducteur doit être rattaché à un profil employé valide pour démarrer un voyage',
        );
      }

      if (driverObj.employe.statut !== 'ACTIF') {
        throw new ConflictException(
          'Ce conducteur n’est pas actif au niveau RH et ne peut pas démarrer un voyage',
        );
      }

      if (
        driverObj.statut === ConducteurStatut.INDISPONIBLE ||
        driverObj.statut === ConducteurStatut.INACTIF
      ) {
        throw new ConflictException('Ce conducteur n’est pas disponible pour démarrer ce voyage');
      }

      // Conflict check for active trip within same tenant
      const activeConflict = await tx.voyage.findFirst({
        where: {
          companyId,
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
    companyId: number,
  ): Promise<void> {
    const { tracteurImmat, remorqueImmat, driverId } = resources;

    if (tracteurImmat) {
      const trimmed = tracteurImmat.trim();
      const veh = await tx.vehicule.findFirst({
        where: {
          companyId,
          immatriculation: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (veh) {
        await tx.vehicule.update({
          where: { id: veh.id },
          data: { statut: VehiculeStatut.EN_VOYAGE },
        });
      }
    }

    if (remorqueImmat) {
      const trimmed = remorqueImmat.trim();
      const veh = await tx.vehicule.findFirst({
        where: {
          companyId,
          immatriculation: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (veh) {
        await tx.vehicule.update({
          where: { id: veh.id },
          data: { statut: VehiculeStatut.EN_VOYAGE },
        });
      }
    }

    if (driverId) {
      const d = await tx.conducteur.findFirst({ where: { id: driverId, companyId } });
      if (d) {
        await tx.conducteur.update({
          where: { id: d.id },
          data: { statut: ConducteurStatut.EN_VOYAGE },
        });
      }
    }
  }

  /**
   * Safely releases resources when leaving EN_COURS status or upon resource reassignment/deletion.
   * Changes EN_VOYAGE -> DISPONIBLE if not assigned to another active trip
   * and preserves non-trip states (MAINTENANCE, HORS_SERVICE, INDISPONIBLE, INACTIF).
   */
  async releaseResources(
    tx: Prisma.TransactionClient,
    resources: {
      tracteurImmat?: string | null;
      remorqueImmat?: string | null;
      nomConducteur?: string | null;
      excludeVoyageId?: number;
    },
    companyId: number,
  ): Promise<void> {
    const { tracteurImmat, remorqueImmat, nomConducteur, excludeVoyageId } = resources;

    // Release Tractor
    if (tracteurImmat) {
      const trimmed = tracteurImmat.trim();
      const veh = await tx.vehicule.findFirst({
        where: {
          companyId,
          immatriculation: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (veh && veh.statut === VehiculeStatut.EN_VOYAGE) {
        const remainingActive = await tx.voyage.findFirst({
          where: {
            companyId,
            statut: VoyageStatut.EN_COURS,
            ...(excludeVoyageId ? { idVoyage: { not: excludeVoyageId } } : {}),
            OR: [
              { tracteur: { equals: veh.immatriculation, mode: 'insensitive' } },
              { remorque: { equals: veh.immatriculation, mode: 'insensitive' } },
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
      const veh = await tx.vehicule.findFirst({
        where: {
          companyId,
          immatriculation: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (veh && veh.statut === VehiculeStatut.EN_VOYAGE) {
        const remainingActive = await tx.voyage.findFirst({
          where: {
            companyId,
            statut: VoyageStatut.EN_COURS,
            ...(excludeVoyageId ? { idVoyage: { not: excludeVoyageId } } : {}),
            OR: [
              { tracteur: { equals: veh.immatriculation, mode: 'insensitive' } },
              { remorque: { equals: veh.immatriculation, mode: 'insensitive' } },
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
      const matchedDrivers = await tx.conducteur.findMany({
        where: {
          companyId,
          nomConducteur: { equals: trimmed, mode: 'insensitive' },
        },
        include: { employe: true },
      });

      // Also check normalized spaces if direct match returned 0
      if (matchedDrivers.length === 0) {
        const normalized = trimmed.replace(/\s+/g, ' ');
        if (normalized !== trimmed) {
          const fallback = await tx.conducteur.findMany({
            where: {
              companyId,
              nomConducteur: { equals: normalized, mode: 'insensitive' },
            },
            include: { employe: true },
          });
          matchedDrivers.push(...fallback);
        }
      }

      // If excludeVoyageId is provided, also check linked traversee maritime driver
      if (excludeVoyageId && matchedDrivers.length === 0) {
        const linkedTm = await tx.traverseeMaritime.findFirst({
          where: { idVoyage: excludeVoyageId, companyId, idConducteur: { not: null } },
          select: { idConducteur: true },
        });
        if (linkedTm?.idConducteur) {
          const tmDriver = await tx.conducteur.findFirst({
            where: { id: linkedTm.idConducteur, companyId },
            include: { employe: true },
          });
          if (tmDriver) {
            matchedDrivers.push(tmDriver);
          }
        }
      }

      for (const driverObj of matchedDrivers) {
        if (driverObj.statut === ConducteurStatut.EN_VOYAGE) {
          const remainingActive = await tx.voyage.findFirst({
            where: {
              companyId,
              statut: VoyageStatut.EN_COURS,
              ...(excludeVoyageId ? { idVoyage: { not: excludeVoyageId } } : {}),
              nomConducteur: { equals: driverObj.nomConducteur, mode: 'insensitive' },
            },
          });
          if (!remainingActive) {
            // Determine safe release status preserving HR status
            let targetStatut: ConducteurStatut = ConducteurStatut.DISPONIBLE;
            if (
              !driverObj.employe ||
              driverObj.employe.supprimeLe ||
              driverObj.employe.statut === 'INACTIF' ||
              ['DEMISSIONNAIRE', 'LICENCIE', 'RETRAITE'].includes(driverObj.employe.statut)
            ) {
              targetStatut = ConducteurStatut.INACTIF;
            } else if (driverObj.employe.statut === 'SUSPENDU') {
              targetStatut = ConducteurStatut.INDISPONIBLE;
            }

            await tx.conducteur.update({
              where: { id: driverObj.id },
              data: { statut: targetStatut },
            });
          }
        }
      }
    }
  }

  /**
   * Unified resource lifecycle synchronization for Voyage create, update, status-change, and delete.
   */
  async syncVoyageResources(
    tx: Prisma.TransactionClient,
    params: {
      voyageId: number;
      wasActive: boolean;
      isActive: boolean;
      oldResources: {
        tracteur?: string | null;
        remorque?: string | null;
        nomConducteur?: string | null;
      };
      newResources: {
        tracteur?: string | null;
        remorque?: string | null;
        nomConducteur?: string | null;
        driverId?: number | null;
      };
    },
    companyId: number,
  ): Promise<void> {
    const { voyageId, wasActive, isActive, oldResources, newResources } = params;

    const oldT = oldResources.tracteur ? oldResources.tracteur.trim() : null;
    const oldR = oldResources.remorque ? oldResources.remorque.trim() : null;
    const oldD = oldResources.nomConducteur ? oldResources.nomConducteur.trim() : null;

    const newT = newResources.tracteur ? newResources.tracteur.trim() : null;
    const newR = newResources.remorque ? newResources.remorque.trim() : null;
    const newD = newResources.nomConducteur ? newResources.nomConducteur.trim() : null;

    if (wasActive && !isActive) {
      // 1. Leaving EN_COURS -> release all old resources
      await this.releaseResources(
        tx,
        {
          tracteurImmat: oldT,
          remorqueImmat: oldR,
          nomConducteur: oldD,
          excludeVoyageId: voyageId,
        },
        companyId,
      );
      // In case resources were also changed in the same payload, ensure new ones are released if needed
      if (newT && (!oldT || newT.toUpperCase() !== oldT.toUpperCase())) {
        await this.releaseResources(tx, { tracteurImmat: newT, excludeVoyageId: voyageId }, companyId);
      }
      if (newR && (!oldR || newR.toUpperCase() !== oldR.toUpperCase())) {
        await this.releaseResources(tx, { remorqueImmat: newR, excludeVoyageId: voyageId }, companyId);
      }
      if (newD && (!oldD || newD.toLowerCase() !== oldD.toLowerCase())) {
        await this.releaseResources(tx, { nomConducteur: newD, excludeVoyageId: voyageId }, companyId);
      }
    } else if (!wasActive && isActive) {
      // 2. Entering EN_COURS -> acquire new resources
      await this.acquireResources(
        tx,
        {
          tracteurImmat: newT,
          remorqueImmat: newR,
          driverId: newResources.driverId,
        },
        companyId,
      );
    } else if (wasActive && isActive) {
      // 3. Staying EN_COURS -> handle reassignments or clearings
      // Tractor reassignment / clear
      const isTractorChanged = (oldT || '').toUpperCase() !== (newT || '').toUpperCase();
      if (isTractorChanged) {
        if (oldT) {
          await this.releaseResources(
            tx,
            { tracteurImmat: oldT, excludeVoyageId: voyageId },
            companyId,
          );
        }
        if (newT) {
          await this.acquireResources(tx, { tracteurImmat: newT }, companyId);
        }
      }

      // Trailer reassignment / clear
      const isTrailerChanged = (oldR || '').toUpperCase() !== (newR || '').toUpperCase();
      if (isTrailerChanged) {
        if (oldR) {
          await this.releaseResources(
            tx,
            { remorqueImmat: oldR, excludeVoyageId: voyageId },
            companyId,
          );
        }
        if (newR) {
          await this.acquireResources(tx, { remorqueImmat: newR }, companyId);
        }
      }

      // Driver reassignment / clear
      const isDriverChanged = (oldD || '').toLowerCase() !== (newD || '').toLowerCase();
      if (isDriverChanged) {
        if (oldD) {
          await this.releaseResources(
            tx,
            { nomConducteur: oldD, excludeVoyageId: voyageId },
            companyId,
          );
        }
        if (newResources.driverId) {
          await this.acquireResources(tx, { driverId: newResources.driverId }, companyId);
        }
      }
    }
  }
}
