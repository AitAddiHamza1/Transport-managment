import { PrismaService } from './prisma/prisma.service';
import { DocumentsVehiculesService } from './modules/documents-vehicules/documents-vehicules.service';
import { VehiculesService } from './modules/vehicules/vehicules.service';

async function runDocumentsVehiculesVerification() {
  console.log('======================================================================');
  console.log('=== DOCUMENTS VÉHICULES MODULE INVARIANT VERIFICATION SUITE ===');
  console.log('======================================================================\n');

  const prisma = new PrismaService();
  const docService = new DocumentsVehiculesService(prisma);
  const vehiculeService = new VehiculesService(prisma);

  try {
    // -------------------------------------------------------------
    // Setup Test Vehicle
    // -------------------------------------------------------------
    const testImmat = `TEST-DOC-${Date.now().toString().slice(-4)}`;
    console.log(`[SETUP] Creating test vehicle ${testImmat}...`);
    const vehicle = await vehiculeService.create({
      immatriculation: testImmat,
      marque: 'Volvo',
      modele: 'FH16',
      typeVehicule: 'CAMION',
    });
    console.log(`  ✓ Vehicle created: #${vehicle.id} (${vehicle.immatriculation})`);

    // -------------------------------------------------------------
    // Test 1: Create Document & Status Derivation (VALIDE)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Document Creation & Status Derivation (VALIDE)...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    const doc1 = await docService.create({
      immatriculation: testImmat,
      typeDocument: 'CARTE_GRISE',
      numeroDocument: 'CG-998877',
      dateEmission: '2025-01-01',
      dateExpiration: futureDate.toISOString().split('T')[0],
      organismeEmetteur: 'Service des Mines',
      notes: 'Carte grise valide',
    });

    if (doc1.status !== 'VALIDE') {
      throw new Error(`Expected status VALIDE, got ${doc1.status}`);
    }
    if (doc1.daysUntilExpiry === null || doc1.daysUntilExpiry <= 30) {
      throw new Error(`Expected daysUntilExpiry > 30, got ${doc1.daysUntilExpiry}`);
    }

    console.log(
      `  ✓ PASSED: Carte Grise #${doc1.idDocument} created with status ${doc1.status} (${doc1.daysUntilExpiry} days left)`,
    );

    // -------------------------------------------------------------
    // Test 2: Status Derivation BIENTOT_EXPIRE (Expiring in 15 days)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Status Derivation BIENTOT_EXPIRE...');
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 15);

    const doc2 = await docService.create({
      immatriculation: testImmat,
      typeDocument: 'ASSURANCE',
      numeroDocument: 'ASS-112233',
      dateExpiration: soonDate.toISOString().split('T')[0],
      organismeEmetteur: 'Wafa Assurance',
    });

    if (doc2.status !== 'BIENTOT_EXPIRE') {
      throw new Error(`Expected status BIENTOT_EXPIRE, got ${doc2.status}`);
    }

    console.log(
      `  ✓ PASSED: Assurance #${doc2.idDocument} created with status ${doc2.status} (${doc2.daysUntilExpiry} days left)`,
    );

    // -------------------------------------------------------------
    // Test 3: Status Derivation EXPIRE (Expired 10 days ago)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Status Derivation EXPIRE...');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const doc3 = await docService.create({
      immatriculation: testImmat,
      typeDocument: 'VISITE_TECHNIQUE',
      numeroDocument: 'VT-445566',
      dateExpiration: pastDate.toISOString().split('T')[0],
    });

    if (doc3.status !== 'EXPIRE') {
      throw new Error(`Expected status EXPIRE, got ${doc3.status}`);
    }

    console.log(
      `  ✓ PASSED: Visite Technique #${doc3.idDocument} created with status ${doc3.status} (${doc3.daysUntilExpiry} days left)`,
    );

    // -------------------------------------------------------------
    // Test 4: 409 Conflict on Duplicate Active Document Type
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing 409 Conflict on Duplicate Active Document Type...');
    try {
      await docService.create({
        immatriculation: testImmat,
        typeDocument: 'CARTE_GRISE', // Already exists!
        numeroDocument: 'CG-DUP',
      });
      throw new Error('FAILED: Expected 409 Conflict when creating duplicate active CARTE_GRISE');
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('existe déjà')) {
        console.log('  ✓ PASSED: 409 Conflict correctly thrown for duplicate active document');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 5: Date Validation (Expiration < Emission)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Date Validation (Expiration < Emission)...');
    try {
      await docService.create({
        immatriculation: testImmat,
        typeDocument: 'VIGNETTE',
        dateEmission: '2026-06-01',
        dateExpiration: '2026-05-01', // Invalid!
      });
      throw new Error('FAILED: Expected BadRequestException for invalid dates');
    } catch (err: any) {
      if (err.status === 400 || err.message?.includes('antérieure')) {
        console.log('  ✓ PASSED: Date validation correctly rejected invalid dates');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 6: File Upload & Magic Bytes Inspection
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing File Upload & Magic Bytes Inspection...');
    const pdfBuffer = Buffer.from('%PDF-1.4 Test PDF File Content Buffer Header', 'utf8');
    const mockFile: any = {
      fieldname: 'file',
      originalname: 'test-carte-grise.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: pdfBuffer,
      size: pdfBuffer.length,
    };

    const uploadedDoc = await docService.uploadFile(doc1.idDocument, mockFile);
    if (!uploadedDoc.hasFile || uploadedDoc.originalFileName !== 'test-carte-grise.pdf') {
      throw new Error('File upload failed or metadata mismatch');
    }

    console.log(`  ✓ PASSED: File uploaded successfully (URL: ${uploadedDoc.fileUrl})`);

    // -------------------------------------------------------------
    // Test 7: Soft Delete & Post-Delete 404
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Soft Delete & Post-Delete 404 Enforcement...');
    await docService.softDelete(doc1.idDocument);

    try {
      await docService.findOne(doc1.idDocument);
      throw new Error('FAILED: Expected 404 for soft-deleted document');
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('introuvable')) {
        console.log('  ✓ PASSED: Soft-deleted document returns 404 Not Found');
      } else {
        throw err;
      }
    }

    // After soft delete, creating a new document of same type is allowed!
    const reCreated = await docService.create({
      immatriculation: testImmat,
      typeDocument: 'CARTE_GRISE',
      numeroDocument: 'CG-NEW-AFTER-DELETE',
    });
    console.log(
      `  ✓ PASSED: Re-creating type CARTE_GRISE allowed after soft delete (New ID: #${reCreated.idDocument})`,
    );

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records...');
    await prisma.documentVehicule.deleteMany({
      where: { immatriculation: testImmat },
    });
    await prisma.vehicule.delete({
      where: { id: vehicle.id },
    });

    console.log('\n======================================================================');
    console.log('=== ALL DOCUMENTS VÉHICULES INVARIANT TESTS PASSED CLEANLY ===');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDocumentsVehiculesVerification();
