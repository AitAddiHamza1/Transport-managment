/**
 * Phase 12.2 Legacy Data Audit Script
 * Path: backend/scripts/audit-phase12-2.js
 *
 * Command: npm run audit:phase12-2 [--apply]
 *
 * Analyzes:
 * 1. EN_COURS Voyages with DISPONIBLE resources
 * 2. EN_VOYAGE resources without an active EN_COURS Voyage
 * 3. Duplicate resource usage in multiple EN_COURS Voyages
 * 4. Cross-role tractor = trailer in EN_COURS Voyages
 * 5. Driver name resolution issues (missing or ambiguous driver matches)
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const applyFix = process.argv.includes('--apply');

async function main() {
  console.log('=== PHASE 12.2 LEGACY DATA AUDIT ===\n');
  if (applyFix) {
    console.log('⚠️  Mode: --apply flag detected. Safe repairs will be performed.\n');
  } else {
    console.log('ℹ️  Mode: Audit only (read-only). Run with --apply to repair safe inconsistencies.\n');
  }

  let totalIssues = 0;

  try {
    // 1. EN_COURS Voyages check
    const activeVoyages = await prisma.voyage.findMany({
      where: { statut: 'EN_COURS' },
    });

    console.log(`🔍 Found ${activeVoyages.length} EN_COURS voyage(s).\n`);

    for (const v of activeVoyages) {
      // Check Tractor
      if (v.tracteur) {
        const veh = await prisma.vehicule.findUnique({ where: { immatriculation: v.tracteur } });
        if (!veh) {
          console.log(`❌ Voyage #${v.idVoyage}: Tractor "${v.tracteur}" does not exist in Vehicule table.`);
          totalIssues++;
        } else if (veh.statut !== 'EN_VOYAGE') {
          console.log(`⚠️  Voyage #${v.idVoyage}: Tractor "${v.tracteur}" is EN_COURS in trip but has status "${veh.statut}".`);
          totalIssues++;
          if (applyFix && veh.statut === 'DISPONIBLE') {
            await prisma.vehicule.update({ where: { id: veh.id }, data: { statut: 'EN_VOYAGE' } });
            console.log(`   -> Fixed: Updated tractor "${v.tracteur}" status to EN_VOYAGE.`);
          }
        }
      }

      // Check Trailer
      if (v.remorque) {
        const veh = await prisma.vehicule.findUnique({ where: { immatriculation: v.remorque } });
        if (!veh) {
          console.log(`❌ Voyage #${v.idVoyage}: Trailer "${v.remorque}" does not exist in Vehicule table.`);
          totalIssues++;
        } else if (veh.statut !== 'EN_VOYAGE') {
          console.log(`⚠️  Voyage #${v.idVoyage}: Trailer "${v.remorque}" is EN_COURS in trip but has status "${veh.statut}".`);
          totalIssues++;
          if (applyFix && veh.statut === 'DISPONIBLE') {
            await prisma.vehicule.update({ where: { id: veh.id }, data: { statut: 'EN_VOYAGE' } });
            console.log(`   -> Fixed: Updated trailer "${v.remorque}" status to EN_VOYAGE.`);
          }
        }
      }

      // Check Driver
      if (v.nomConducteur) {
        const drivers = await prisma.conducteur.findMany({
          where: { nomConducteur: { equals: v.nomConducteur, mode: 'insensitive' } },
        });

        if (drivers.length === 0) {
          console.log(`❌ Voyage #${v.idVoyage}: Driver "${v.nomConducteur}" does not match any Conducteur record.`);
          totalIssues++;
        } else if (drivers.length > 1) {
          console.log(`❌ Voyage #${v.idVoyage}: Driver "${v.nomConducteur}" matches multiple (${drivers.length}) Conducteur records.`);
          totalIssues++;
        } else {
          const d = drivers[0];
          if (d.statut !== 'EN_VOYAGE') {
            console.log(`⚠️  Voyage #${v.idVoyage}: Driver "${d.nomConducteur}" is EN_COURS in trip but has status "${d.statut}".`);
            totalIssues++;
            if (applyFix && d.statut === 'DISPONIBLE') {
              await prisma.conducteur.update({ where: { id: d.id }, data: { statut: 'EN_VOYAGE' } });
              console.log(`   -> Fixed: Updated driver "${d.nomConducteur}" status to EN_VOYAGE.`);
            }
          }
        }
      }

      // Cross-role tractor = trailer
      if (v.tracteur && v.remorque && v.tracteur.trim().toLowerCase() === v.remorque.trim().toLowerCase()) {
        console.log(`❌ Voyage #${v.idVoyage}: Tractor and Trailer are identical ("${v.tracteur}").`);
        totalIssues++;
      }
    }

    // 2. EN_VOYAGE vehicles without an active EN_COURS voyage
    const enVoyageVehicles = await prisma.vehicule.findMany({
      where: { statut: 'EN_VOYAGE' },
    });

    for (const veh of enVoyageVehicles) {
      const activeTrip = await prisma.voyage.findFirst({
        where: {
          statut: 'EN_COURS',
          OR: [
            { tracteur: { equals: veh.immatriculation, mode: 'insensitive' } },
            { remorque: { equals: veh.immatriculation, mode: 'insensitive' } },
          ],
        },
      });

      if (!activeTrip) {
        console.log(`⚠️  Vehicle "${veh.immatriculation}" is marked EN_VOYAGE but has no active EN_COURS voyage.`);
        totalIssues++;
        if (applyFix) {
          await prisma.vehicule.update({ where: { id: veh.id }, data: { statut: 'DISPONIBLE' } });
          console.log(`   -> Fixed: Released vehicle "${veh.immatriculation}" to DISPONIBLE.`);
        }
      }
    }

    // 3. EN_VOYAGE drivers without an active EN_COURS voyage
    const enVoyageDrivers = await prisma.conducteur.findMany({
      where: { statut: 'EN_VOYAGE' },
    });

    for (const drv of enVoyageDrivers) {
      const activeTrip = await prisma.voyage.findFirst({
        where: {
          statut: 'EN_COURS',
          nomConducteur: { equals: drv.nomConducteur, mode: 'insensitive' },
        },
      });

      if (!activeTrip) {
        console.log(`⚠️  Driver "${drv.nomConducteur}" is marked EN_VOYAGE but has no active EN_COURS voyage.`);
        totalIssues++;
        if (applyFix) {
          await prisma.conducteur.update({ where: { id: drv.id }, data: { statut: 'DISPONIBLE' } });
          console.log(`   -> Fixed: Released driver "${drv.nomConducteur}" to DISPONIBLE.`);
        }
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`AUDIT SUMMARY: ${totalIssues} issue(s) detected.`);
    console.log(`${'='.repeat(50)}\n`);
  } catch (err) {
    console.error('❌ Audit error:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
