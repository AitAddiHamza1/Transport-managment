import { PrismaService } from './prisma/prisma.service';
import { DepensesAdministrativesService } from './modules/depenses-administratives/depenses-administratives.service';
import { ADMINISTRATIVE_EXPENSE_CATEGORIES } from './modules/depenses-administratives/constants/administrative-expense-categories';

async function runChargesAdministrativesVerification() {
  console.log('==================================================================');
  console.log('=== CHARGES ADMINISTRATIVES MODULE INVARIANT VERIFICATION SUITE ===');
  console.log('==================================================================\n');

  const prisma = new PrismaService();
  const service = new DepensesAdministrativesService(prisma);

  try {
    // -------------------------------------------------------------
    // Test 1: Category Contract Validation
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Administrative Expense Category Contract...');
    if (ADMINISTRATIVE_EXPENSE_CATEGORIES.length !== 12) {
      throw new Error(
        `Expected 12 approved categories, found ${ADMINISTRATIVE_EXPENSE_CATEGORIES.length}`,
      );
    }
    const expectedCats = [
      'LOYER',
      'EAU',
      'ELECTRICITE',
      'INTERNET_TELEPHONE',
      'FOURNITURES_BUREAU',
      'HONORAIRES',
      'FRAIS_BANCAIRES',
      'ASSURANCE',
      'IMPOTS_TAXES',
      'ABONNEMENTS',
      'ENTRETIEN_BUREAU',
      'AUTRE',
    ];
    for (const cat of expectedCats) {
      if (!ADMINISTRATIVE_EXPENSE_CATEGORIES.includes(cat as any)) {
        throw new Error(`Missing expected category: ${cat}`);
      }
    }
    console.log('  ✓ PASSED: All 12 approved category codes strictly match backend contract');

    // -------------------------------------------------------------
    // Test 2: Expense Creation without Receipt
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Expense Creation without Receipt...');
    const testAdmin = await prisma.user.findFirst();
    const createdExpense = await service.create(
      {
        categorieDepense: 'LOYER',
        description: 'Test Loyer Bureau Mai 2026',
        montant: 1250.5,
        dateDepense: '2026-05-01',
      },
      testAdmin?.id,
    );

    if (createdExpense.categorieDepense !== 'LOYER') throw new Error('Category mismatch');
    if (createdExpense.montant !== '1250.50')
      throw new Error(`Expected "1250.50", got "${createdExpense.montant}"`);
    if (createdExpense.hasReceipt !== false) throw new Error('Expected hasReceipt false');
    if (createdExpense.receiptUrl !== null) throw new Error('Expected receiptUrl null');

    console.log(
      `  ✓ PASSED: Created Administrative Expense #${createdExpense.idDepense} with montant="1250.50"`,
    );

    // -------------------------------------------------------------
    // Test 3: Creation with Valid Receipt File (PDF)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Creation with Valid Receipt File (PDF)...');
    const validPdfBuffer = Buffer.from(
      '%PDF-1.4 Mock PDF Content for Administrative Expense Receipt Verification Test',
    );
    const mockFile: Express.Multer.File = {
      fieldname: 'recu',
      originalname: 'facture_loyer.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
      buffer: validPdfBuffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const expenseWithReceipt = await service.create(
      {
        categorieDepense: 'INTERNET_TELEPHONE',
        description: 'Abonnement Internet 2026',
        montant: 500.0,
        dateDepense: '2026-05-05',
      },
      testAdmin?.id,
      mockFile,
    );

    if (!expenseWithReceipt.hasReceipt) throw new Error('Expected hasReceipt true');
    if (
      !expenseWithReceipt.receiptUrl?.includes(
        `/api/depenses-administratives/${expenseWithReceipt.idDepense}/recu`,
      )
    ) {
      throw new Error(`Invalid receiptUrl: ${expenseWithReceipt.receiptUrl}`);
    }

    console.log(
      `  ✓ PASSED: Created Expense #${expenseWithReceipt.idDepense} with receipt URL "${expenseWithReceipt.receiptUrl}"`,
    );

    // -------------------------------------------------------------
    // Test 4: Receipt Replacement & Physical Disk Cleanup
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Receipt Replacement & File Lifecycle...');
    const newPdfBuffer = Buffer.from('%PDF-1.5 Updated Receipt PDF File Content');
    const newMockFile: Express.Multer.File = {
      fieldname: 'recu',
      originalname: 'facture_loyer_updated.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: newPdfBuffer.length,
      buffer: newPdfBuffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const updatedWithNewReceipt = await service.uploadOrReplaceReceipt(
      expenseWithReceipt.idDepense,
      newMockFile,
    );

    if (updatedWithNewReceipt.fichierRecu === expenseWithReceipt.fichierRecu) {
      throw new Error('Receipt stored path was not updated');
    }

    console.log(
      `  ✓ PASSED: Successfully replaced receipt for Expense #${expenseWithReceipt.idDepense}`,
    );

    // -------------------------------------------------------------
    // Test 5: Dynamic Filtered Statistics
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Dynamic Filtered Statistics Calculation...');
    const statsLoyer = await service.findStats({ categorieDepense: 'LOYER' });
    if (statsLoyer.totalCount !== 1)
      throw new Error(`Expected totalCount 1, got ${statsLoyer.totalCount}`);
    if (statsLoyer.montantTotal !== '1250.50')
      throw new Error(`Expected montantTotal "1250.50", got "${statsLoyer.montantTotal}"`);

    const statsGlobal = await service.findStats({});
    if (statsGlobal.totalCount !== 2)
      throw new Error(`Expected totalCount 2, got ${statsGlobal.totalCount}`);
    if (statsGlobal.montantTotal !== '1750.50')
      throw new Error(`Expected montantTotal "1750.50", got "${statsGlobal.montantTotal}"`);
    if (statsGlobal.montantMoyen !== '875.25')
      throw new Error(`Expected montantMoyen "875.25", got "${statsGlobal.montantMoyen}"`);

    console.log(
      `  ✓ PASSED: Stats calculated totalCount=${statsGlobal.totalCount}, total=${statsGlobal.montantTotal}, average=${statsGlobal.montantMoyen}`,
    );

    // -------------------------------------------------------------
    // Test 6: Soft Delete & Post-Delete 404 Protection
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Soft Delete & Post-Delete 404 Protection...');
    await service.softDelete(createdExpense.idDepense);

    let getBlocked = false;
    try {
      await service.findOne(createdExpense.idDepense);
    } catch (err: any) {
      if (err.status === 404 || err.name === 'NotFoundException') {
        getBlocked = true;
      }
    }

    if (!getBlocked) {
      throw new Error('Soft deleted expense was returned by findOne!');
    }

    const postDeleteStats = await service.findStats({});
    if (postDeleteStats.totalCount !== 1) {
      throw new Error(`Expected post-delete stats totalCount 1, got ${postDeleteStats.totalCount}`);
    }

    console.log(
      '  ✓ PASSED: Soft deletion excluded expense from queries and stats. Detail GET returned 404 as expected.',
    );

    // Cleanup test records
    console.log('\n[TEST 7] Cleaning up test records...');
    await service.softDelete(expenseWithReceipt.idDepense);
    await prisma.depenseAdministrative.deleteMany({
      where: { idDepense: { in: [createdExpense.idDepense, expenseWithReceipt.idDepense] } },
    });
    service['deletePhysicalFile'](updatedWithNewReceipt.fichierRecu);

    console.log('\n==================================================================');
    console.log('=== ALL CHARGES ADMINISTRATIVES INVARIANT TESTS PASSED CLEANLY ===');
    console.log('==================================================================\n');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runChargesAdministrativesVerification();
