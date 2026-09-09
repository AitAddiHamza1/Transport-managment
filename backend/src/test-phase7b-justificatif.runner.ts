import { PrismaClient, JustificatifType } from '@prisma/client';
import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { CreateDepenseVehiculeDto } from './modules/depenses-vehicules/dto/create-depense-vehicule.dto';
import { UpdateDepenseVehiculeDto } from './modules/depenses-vehicules/dto/update-depense-vehicule.dto';
import { DashboardService } from './modules/dashboard/dashboard.service';
import * as fs from 'fs';
import * as path from 'path';

async function runTests() {
  console.log('=== RUNNING PHASE 7B JUSTIFICATIF DE DEPENSE VEHICULE TESTS ===');
  let passedCount = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
    passedCount++;
    console.log(`✓ ${msg}`);
  }

  const prisma = new PrismaClient();
  const service = new DepensesVehiculesService(prisma as any);
  const dashboardService = new DashboardService(prisma as any);

  // Setup test environment: ensure a test vehicle exists
  let vehicle = await prisma.vehicule.findUnique({ where: { immatriculation: 'TEST-7B-IMMAT' } });
  if (!vehicle) {
    vehicle = await prisma.vehicule.create({
      data: {
        immatriculation: 'TEST-7B-IMMAT',
        marque: 'Daf',
        modele: 'XF',
        typeVehicule: 'CAMION',
      },
    });
  }

  // Create mock files
  const mockPdfFile = {
    fieldname: 'file',
    originalname: 'test_recu.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test file data'),
    size: 24,
  } as Express.Multer.File;

  const mockInvalidSignatureFile = {
    fieldname: 'file',
    originalname: 'test_recu.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('NOTAPDF data signature'),
    size: 22,
  } as Express.Multer.File;

  const mockOversizedFile = {
    fieldname: 'file',
    originalname: 'test_recu.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.alloc(6 * 1024 * 1024), // 6 MB
    size: 6 * 1024 * 1024,
  } as Express.Multer.File;

  const mockPngFile = {
    fieldname: 'file',
    originalname: 'test_image.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    size: 8,
  } as Express.Multer.File;

  try {
    // Clean up past runs
    await prisma.depenseVehicule.deleteMany({
      where: { immatriculation: 'TEST-7B-IMMAT' },
    });

    console.log('\n--- 1. Creation Validation Rules ---');

    // 1. Create AVEC_FACTURE with valid reference + file
    const dto1: CreateDepenseVehiculeDto = {
      categorieDepense: 'ENTRETIEN',
      justificatifType: JustificatifType.AVEC_FACTURE,
      typeFacture: 'FAC-7B-001',
      immatriculation: 'TEST-7B-IMMAT',
      montant: 1200.0,
      description: 'Test creation avec facture',
    };
    const created1 = await service.create(dto1, mockPdfFile);
    assert(created1.justificatifType === 'AVEC_FACTURE', 'Expense 1 type is AVEC_FACTURE');
    assert(created1.typeFacture === 'FAC-7B-001', 'Expense 1 typeFacture is set');
    assert(created1.hasReceipt === true, 'Expense 1 has a receipt file attached');
    assert(created1.fichierRecu !== null, 'Expense 1 physical file reference is recorded');

    // 2. Create AVEC_FACTURE without reference -> rejected
    try {
      const dto2 = { ...dto1, typeFacture: '' };
      await service.create(dto2, mockPdfFile);
      assert(false, 'Should fail when creating AVEC_FACTURE without reference');
    } catch (err: any) {
      assert(
        err.message.includes('facture/référence est requis'),
        'Throws error for empty reference',
      );
    }

    // 3. Create AVEC_FACTURE without file -> rejected
    try {
      await service.create(dto1, undefined);
      assert(false, 'Should fail when creating AVEC_FACTURE without file');
    } catch (err: any) {
      assert(
        err.message.includes('fichier de reçu ou de facture est requis'),
        'Throws error for missing file',
      );
    }

    // 4. Create SANS_FACTURE without reference/file -> accepted
    const dto3: CreateDepenseVehiculeDto = {
      categorieDepense: 'PEAGE',
      justificatifType: JustificatifType.SANS_FACTURE,
      immatriculation: 'TEST-7B-IMMAT',
      montant: 150.0,
      description: 'Peage highway',
    };
    const created3 = await service.create(dto3, undefined);
    assert(created3.justificatifType === 'SANS_FACTURE', 'Expense 3 type is SANS_FACTURE');
    assert(created3.typeFacture === null, 'Expense 3 typeFacture is null');
    assert(created3.hasReceipt === false, 'Expense 3 does not have a receipt');
    assert(created3.fichierRecu === null, 'Expense 3 fichierRecu is null');

    // 5. Create SANS_FACTURE while maliciously sending reference -> server clears/ignores it
    const dto4: CreateDepenseVehiculeDto = {
      ...dto3,
      typeFacture: 'HACKED-REF',
    };
    const created4 = await service.create(dto4, undefined);
    assert(created4.justificatifType === 'SANS_FACTURE', 'Expense 4 type is SANS_FACTURE');
    assert(created4.typeFacture === null, 'Expense 4 typeFacture is automatically set to null');

    // 6. Create SANS_FACTURE while sending file -> server does not retain file
    const created5 = await service.create(dto3, mockPdfFile);
    assert(created5.justificatifType === 'SANS_FACTURE', 'Expense 5 type is SANS_FACTURE');
    assert(created5.fichierRecu === null, 'Expense 5 ignores/clears the uploaded file reference');

    console.log('\n--- 2. Transition and Update Rules ---');

    // 7. SANS_FACTURE -> AVEC_FACTURE (requires reference and file)
    try {
      const updateDto: UpdateDepenseVehiculeDto = {
        justificatifType: JustificatifType.AVEC_FACTURE,
      };
      await service.update(created3.idDepense, updateDto);
      assert(false, 'SANS_FACTURE -> AVEC_FACTURE should fail without file/reference');
    } catch (err: any) {
      assert(
        err.message.includes('facture/référence est requis') ||
          err.message.includes('fichier de reçu'),
        'Throws missing details error',
      );
    }

    // Now complete valid SANS_FACTURE -> AVEC_FACTURE transition
    const updateDtoValid: UpdateDepenseVehiculeDto = {
      justificatifType: JustificatifType.AVEC_FACTURE,
      typeFacture: 'FAC-RESOLVED',
    };
    const transition1 = await service.update(created3.idDepense, updateDtoValid, mockPdfFile);
    assert(
      transition1.justificatifType === 'AVEC_FACTURE',
      'Transition 1 justificatifType is now AVEC_FACTURE',
    );
    assert(transition1.typeFacture === 'FAC-RESOLVED', 'Transition 1 typeFacture is set');
    assert(transition1.hasReceipt === true, 'Transition 1 has physical file attached');

    // 8. AVEC_FACTURE -> SANS_FACTURE (clears file reference and removes physical file)
    const oldFilePath = transition1.fichierRecu!;
    const physicalPathToVerify = path.join(process.cwd(), oldFilePath.replace('/', ''));
    assert(fs.existsSync(physicalPathToVerify), 'Receipt file physically exists before transition');

    const updateToSansFacture: UpdateDepenseVehiculeDto = {
      justificatifType: JustificatifType.SANS_FACTURE,
    };
    const transition2 = await service.update(created3.idDepense, updateToSansFacture);
    assert(
      transition2.justificatifType === 'SANS_FACTURE',
      'Transition 2 justificatifType is SANS_FACTURE',
    );
    assert(transition2.typeFacture === null, 'Transition 2 typeFacture is cleared');
    assert(transition2.fichierRecu === null, 'Transition 2 fichierRecu is cleared');
    assert(
      !fs.existsSync(physicalPathToVerify),
      'Receipt file is physically removed from the disk',
    );

    // 9. Replace existing invoice file (AVEC_FACTURE -> AVEC_FACTURE with file replacement)
    // Setup another AVEC_FACTURE
    const created6 = await service.create(dto1, mockPdfFile);
    const file1Path = created6.fichierRecu!;
    const file1Physical = path.join(process.cwd(), file1Path.replace('/', ''));
    assert(fs.existsSync(file1Physical), 'File 1 exists');

    // Perform replacement
    const replacementDto: UpdateDepenseVehiculeDto = {
      typeFacture: 'FAC-7B-REPLACED',
    };
    const replaced = await service.update(created6.idDepense, replacementDto, mockPngFile);
    assert(replaced.typeFacture === 'FAC-7B-REPLACED', 'Invoice reference replaced');
    assert(replaced.fichierRecu !== file1Path, 'Fichier reference replaced in DB');
    const file2Physical = path.join(process.cwd(), replaced.fichierRecu!.replace('/', ''));
    assert(fs.existsSync(file2Physical), 'File 2 exists on disk');
    assert(!fs.existsSync(file1Physical), 'Old File 1 was removed from disk successfully');

    // 10. Delete expense and verify file cleanup
    const finalFilePath = replaced.fichierRecu!;
    const finalPhysical = path.join(process.cwd(), finalFilePath.replace('/', ''));
    assert(fs.existsSync(finalPhysical), 'File exists before delete');
    await service.remove(replaced.idDepense);
    assert(!fs.existsSync(finalPhysical), 'File is deleted when vehicle expense is deleted');

    console.log('\n--- 3. File Security and Validation ---');

    // 11. Invalid file type validation
    try {
      const invalidTypeDto = { ...dto1, typeFacture: 'FAC-ERR-TYPE' };
      const invalidTypeFile = {
        ...mockPdfFile,
        mimetype: 'text/plain',
        originalname: 'text.txt',
      } as Express.Multer.File;
      await service.create(invalidTypeDto, invalidTypeFile);
      assert(false, 'Should reject non-image/pdf mime types');
    } catch (err: any) {
      assert(
        err.message.includes('Format de fichier non autorisé') || err.message.includes('Type MIME'),
        'Rejects invalid mime types',
      );
    }

    // 12. Oversized file validation (limit: 5MB)
    try {
      await service.create(dto1, mockOversizedFile);
      assert(false, 'Should reject file larger than 5MB');
    } catch (err: any) {
      assert(err.message.includes('dépasser 5 Mo'), 'Rejects oversized file');
    }

    // 13. Magic-byte signature verification
    try {
      await service.create(dto1, mockInvalidSignatureFile);
      assert(false, 'Should reject file with mismatched magic bytes');
    } catch (err: any) {
      assert(
        err.message.includes('ne correspond pas à une image ou un PDF valide'),
        'Rejects fake PDFs',
      );
    }

    console.log('\n--- 4. Financial Consistency & Regression ---');

    // 14. Expense amount is unchanged regardless of type
    const overviewBefore = await dashboardService.getOverview(
      { preset: 'CE_MOIS' },
      { depenses_vehicules: { voir: true } },
      true,
    );
    const amountBefore = Number(overviewBefore.financial.vehicleExpenseOutflow ?? 0);

    // Create a SANS_FACTURE expense of 5000 MAD
    const testDete: CreateDepenseVehiculeDto = {
      categorieDepense: 'AUTRE',
      justificatifType: JustificatifType.SANS_FACTURE,
      immatriculation: 'TEST-7B-IMMAT',
      montant: 5000.0,
      dateDepense: new Date().toISOString().split('T')[0],
    };
    const createdSans = await service.create(testDete);

    // Create an AVEC_FACTURE expense of 5000 MAD
    const createdAvec = await service.create(
      { ...testDete, justificatifType: JustificatifType.AVEC_FACTURE, typeFacture: 'FAC-5000' },
      mockPdfFile,
    );

    const overviewAfter = await dashboardService.getOverview(
      { preset: 'CE_MOIS' },
      { depenses_vehicules: { voir: true } },
      true,
    );
    const amountAfter = Number(overviewAfter.financial.vehicleExpenseOutflow ?? 0);
    assert(
      amountAfter - amountBefore === 10000.0,
      'Dashboard sums both SANS_FACTURE and AVEC_FACTURE vehicle expenses identically (total cash outflow + 10 000 MAD)',
    );

    // Clean up
    await prisma.depenseVehicule.delete({ where: { idDepense: createdSans.idDepense } });
    await prisma.depenseVehicule.delete({ where: { idDepense: createdAvec.idDepense } });

    console.log(`\n=== ALL ${passedCount} PHASE 7B runner tests passed successfully! ===`);
    process.exit(0);
  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  }
}

runTests();
