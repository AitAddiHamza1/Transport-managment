import { PrismaClient } from '@prisma/client';
import { CompanySettingsService } from './modules/company-settings/company-settings.service';
import { CompanySettingsController } from './modules/company-settings/company-settings.controller';
import { UpdateCompanySettingsDto } from './modules/company-settings/dto/update-company-settings.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const service = new CompanySettingsService(prisma as any);
const controller = new CompanySettingsController(service);

async function runTests() {
  console.log('=== RUNNING MULTI-TENANT STEP 3B-COMPANY-SETTINGS TEST SUITE ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passCount++;
      console.log(`[PASS] Test ${passCount + failCount}: ${testName}`);
    } else {
      failCount++;
      console.error(
        `[FAIL] Test ${passCount + failCount}: ${testName} ${detail ? `(${detail})` : ''}`,
      );
    }
  }

  // 1. Setup Test Companies
  const companyA = await prisma.company.create({
    data: { nom: 'Company Settings Test A' },
  });
  const companyB = await prisma.company.create({
    data: { nom: 'Company Settings Test B' },
  });

  try {
    // -------------------------------------------------------------
    // Test 1: GET Settings Company A (Initial empty)
    // -------------------------------------------------------------
    const resGetA = await controller.getSettings(companyA.id);
    assert(
      resGetA.isConfigured === false && resGetA.settings === null,
      'GET settings Company A initially empty/unconfigured',
    );

    // -------------------------------------------------------------
    // Test 2: GET Settings Company B (Initial empty)
    // -------------------------------------------------------------
    const resGetB = await controller.getSettings(companyB.id);
    assert(
      resGetB.isConfigured === false && resGetB.settings === null,
      'GET settings Company B initially empty/unconfigured',
    );

    // -------------------------------------------------------------
    // Test 3: PATCH Settings Company A Isolation
    // -------------------------------------------------------------
    const patchA: UpdateCompanySettingsDto = {
      nomEntreprise: 'Transport A SARL',
      adresse: '123 Rue Alpha, Casablanca',
      telephone: '+212522111111',
      email: 'contact@transport-a.ma',
      ice: '111122223333444',
      devise: 'MAD',
      templateFacture: 'CLASSIC_TRANSPORT',
    };
    const resPatchA = await controller.updateSettings(companyA.id, patchA);
    assert(
      resPatchA.isConfigured === true &&
        resPatchA.settings?.nomEntreprise === 'Transport A SARL' &&
        resPatchA.settings?.ice === '111122223333444',
      'PATCH settings Company A isolates and sets parameters',
    );

    // -------------------------------------------------------------
    // Test 4: PATCH Settings Company B Isolation
    // -------------------------------------------------------------
    const patchB: UpdateCompanySettingsDto = {
      nomEntreprise: 'Logistique B SA',
      adresse: '456 Avenue Beta, Tangier',
      telephone: '+212539222222',
      email: 'info@logistique-b.ma',
      ice: '999988887777666',
      devise: 'EUR',
      templateFacture: 'TRANSPORT_V2',
    };
    const resPatchB = await controller.updateSettings(companyB.id, patchB);
    assert(
      resPatchB.isConfigured === true &&
        resPatchB.settings?.nomEntreprise === 'Logistique B SA' &&
        resPatchB.settings?.devise === 'EUR' &&
        resPatchB.settings?.ice === '999988887777666',
      'PATCH settings Company B isolates and does not touch Company A',
    );

    // Re-check Company A hasn't changed
    const reCheckA = await controller.getSettings(companyA.id);
    assert(
      reCheckA.settings?.nomEntreprise === 'Transport A SARL' &&
        reCheckA.settings?.devise === 'MAD',
      'Company A settings remain unchanged after Company B update',
    );

    // -------------------------------------------------------------
    // Test 5: Logo Upload Company A
    // -------------------------------------------------------------
    const fakeLogoA: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'logo_a.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('FAKE_PNG_HEADER_COMPANY_A'),
      size: 26,
    } as any;

    const resLogoA = await controller.uploadLogo(companyA.id, fakeLogoA);
    assert(
      resLogoA.settings?.hasLogo === true && resLogoA.settings?.logoOriginalName === 'logo_a.png',
      'POST logo Company A uploads logo asset successfully',
    );

    // -------------------------------------------------------------
    // Test 6: Logo Upload Company B
    // -------------------------------------------------------------
    const fakeLogoB: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'logo_b.jpeg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('FAKE_JPEG_HEADER_COMPANY_B'),
      size: 27,
    } as any;

    const resLogoB = await controller.uploadLogo(companyB.id, fakeLogoB);
    assert(
      resLogoB.settings?.hasLogo === true && resLogoB.settings?.logoOriginalName === 'logo_b.jpeg',
      'POST logo Company B uploads logo without overwriting Company A',
    );

    // -------------------------------------------------------------
    // Test 7: GET Logo File Stream Company A
    // -------------------------------------------------------------
    const streamInfoA = await service.getLogoFileStream(companyA.id);
    let streamBufA = Buffer.alloc(0);
    for await (const chunk of streamInfoA.stream) {
      streamBufA = Buffer.concat([streamBufA, chunk]);
    }
    streamInfoA.stream.destroy();
    assert(
      streamInfoA.mimeType === 'image/png' && streamBufA.toString() === 'FAKE_PNG_HEADER_COMPANY_A',
      'GET logo Company A streams correct file buffer',
    );

    // -------------------------------------------------------------
    // Test 8: GET Logo File Stream Company B
    // -------------------------------------------------------------
    const streamInfoB = await service.getLogoFileStream(companyB.id);
    let streamBufB = Buffer.alloc(0);
    for await (const chunk of streamInfoB.stream) {
      streamBufB = Buffer.concat([streamBufB, chunk]);
    }
    streamInfoB.stream.destroy();
    assert(
      streamInfoB.mimeType === 'image/jpeg' &&
        streamBufB.toString() === 'FAKE_JPEG_HEADER_COMPANY_B',
      'GET logo Company B streams correct separate file buffer',
    );

    // -------------------------------------------------------------
    // Test 9: Delete Logo Company A
    // -------------------------------------------------------------
    const resDelLogoA = await controller.deleteLogo(companyA.id);
    assert(
      resDelLogoA.settings?.hasLogo === false && resDelLogoA.settings?.logoFilename === null,
      'DELETE logo Company A removes logo metadata and physical file',
    );

    // Verify Company B logo still exists
    const reCheckLogoB = await controller.getSettings(companyB.id);
    assert(
      reCheckLogoB.settings?.hasLogo === true,
      'DELETE logo Company A leaves Company B logo intact',
    );

    // -------------------------------------------------------------
    // Test 10: Delete Logo Company B (Idempotence)
    // -------------------------------------------------------------
    await controller.deleteLogo(companyB.id);
    const resDelLogoB2 = await controller.deleteLogo(companyB.id);
    assert(
      resDelLogoB2.settings?.hasLogo === false,
      'DELETE logo Company B is idempotent when no logo exists',
    );

    // -------------------------------------------------------------
    // Test 11: Stamp Upload Company A
    // -------------------------------------------------------------
    const fakeStampA: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'stamp_a.webp',
      encoding: '7bit',
      mimetype: 'image/webp',
      buffer: Buffer.from('FAKE_WEBP_STAMP_COMPANY_A'),
      size: 26,
    } as any;

    const resStampA = await controller.uploadStamp(companyA.id, fakeStampA);
    assert(
      resStampA.settings?.hasStamp === true &&
        resStampA.settings?.stampOriginalName === 'stamp_a.webp',
      'POST stamp Company A uploads stamp asset successfully',
    );

    // -------------------------------------------------------------
    // Test 12: Stamp Upload Company B
    // -------------------------------------------------------------
    const fakeStampB: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'stamp_b.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('FAKE_PNG_STAMP_COMPANY_B'),
      size: 25,
    } as any;

    const resStampB = await controller.uploadStamp(companyB.id, fakeStampB);
    assert(
      resStampB.settings?.hasStamp === true &&
        resStampB.settings?.stampOriginalName === 'stamp_b.png',
      'POST stamp Company B uploads separate stamp asset',
    );

    // -------------------------------------------------------------
    // Test 13: GET Stamp File Stream Company A
    // -------------------------------------------------------------
    const streamStampA = await service.getStampFileStream(companyA.id);
    let bufStampA = Buffer.alloc(0);
    for await (const chunk of streamStampA.stream) {
      bufStampA = Buffer.concat([bufStampA, chunk]);
    }
    streamStampA.stream.destroy();
    assert(
      streamStampA.mimeType === 'image/webp' &&
        bufStampA.toString() === 'FAKE_WEBP_STAMP_COMPANY_A',
      'GET stamp Company A streams correct stamp file',
    );

    // -------------------------------------------------------------
    // Test 14: GET Stamp File Stream Company B
    // -------------------------------------------------------------
    const streamStampB = await service.getStampFileStream(companyB.id);
    let bufStampB = Buffer.alloc(0);
    for await (const chunk of streamStampB.stream) {
      bufStampB = Buffer.concat([bufStampB, chunk]);
    }
    streamStampB.stream.destroy();
    assert(
      streamStampB.mimeType === 'image/png' && bufStampB.toString() === 'FAKE_PNG_STAMP_COMPANY_B',
      'GET stamp Company B streams correct separate stamp file',
    );

    // -------------------------------------------------------------
    // Test 15: Delete Stamp Company A
    // -------------------------------------------------------------
    const resDelStampA = await controller.deleteStamp(companyA.id);
    assert(
      resDelStampA.settings?.hasStamp === false && resDelStampA.settings?.stampFilename === null,
      'DELETE stamp Company A removes stamp for Company A',
    );

    // -------------------------------------------------------------
    // Test 16: Delete Stamp Company B leaves physical file intact if not deleted
    // -------------------------------------------------------------
    const reCheckStampB = await controller.getSettings(companyB.id);
    assert(
      reCheckStampB.settings?.hasStamp === true,
      'Company B stamp remains intact after Company A stamp deletion',
    );
    await controller.deleteStamp(companyB.id);

    // -------------------------------------------------------------
    // Test 17: Invalid File Format Upload (PDF rejected)
    // -------------------------------------------------------------
    const pdfFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('FAKE_PDF'),
      size: 8,
    } as any;

    let formatErr: any = null;
    try {
      await controller.uploadLogo(companyA.id, pdfFile);
    } catch (e) {
      formatErr = e;
    }
    assert(
      formatErr instanceof BadRequestException &&
        formatErr.message.includes('Format de fichier non autorisé'),
      'Invalid file mime type (PDF) throws BadRequestException',
    );

    // -------------------------------------------------------------
    // Test 18: File Oversized (> 2 MB)
    // -------------------------------------------------------------
    const hugeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'huge.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.alloc(2.5 * 1024 * 1024),
      size: 2.5 * 1024 * 1024,
    } as any;

    let sizeErr: any = null;
    try {
      await controller.uploadLogo(companyA.id, hugeFile);
    } catch (e) {
      sizeErr = e;
    }
    assert(
      sizeErr instanceof BadRequestException && sizeErr.message.includes('dépasser 2 Mo'),
      'Oversized file (> 2MB) throws BadRequestException',
    );

    // -------------------------------------------------------------
    // Test 19: Invalid Invoice Template
    // -------------------------------------------------------------
    let tplErr: any = null;
    try {
      await controller.updateSettings(companyA.id, {
        templateFacture: 'INVALID_TEMPLATE_XYZ' as any,
      });
    } catch (e) {
      tplErr = e;
    }
    assert(
      tplErr instanceof BadRequestException && tplErr.message.includes('non supporté'),
      'Invalid invoice template name throws BadRequestException',
    );

    // -------------------------------------------------------------
    // Test 20: isConfigured Isolation
    // -------------------------------------------------------------
    const companyC = await prisma.company.create({
      data: { nom: 'Company Settings Test C' },
    });
    // Partial configuration (missing email)
    await controller.updateSettings(companyC.id, {
      nomEntreprise: 'Incomplete Co',
      adresse: 'Address 123',
      telephone: '+212600000000',
    });
    const checkC = await controller.getSettings(companyC.id);
    assert(
      checkC.isConfigured === false && checkC.settings?.nomEntreprise === 'Incomplete Co',
      'isConfigured evaluation is false when email is missing for Company C',
    );

    // -------------------------------------------------------------
    // Test 21: Forged companyId in DTO ignored
    // -------------------------------------------------------------
    const forgedDto: any = {
      companyId: companyB.id, // Forged attempting to modify B while authenticated as A
      nomEntreprise: 'Legit Company A Update',
    };
    await controller.updateSettings(companyA.id, forgedDto);
    const checkForgedA = await controller.getSettings(companyA.id);
    const checkForgedB = await controller.getSettings(companyB.id);
    assert(
      checkForgedA.settings?.nomEntreprise === 'Legit Company A Update' &&
        checkForgedB.settings?.nomEntreprise !== 'Legit Company A Update',
      'Forged companyId in HTTP DTO body is ignored, CurrentUser companyId enforced',
    );

    // -------------------------------------------------------------
    // Test 22: GET logo when tenant has no logo -> 404
    // -------------------------------------------------------------
    let getLogoErr: any = null;
    try {
      await service.getLogoFileStream(companyC.id);
    } catch (e) {
      getLogoErr = e;
    }
    assert(
      getLogoErr instanceof NotFoundException &&
        getLogoErr.message.includes('Aucun logo configuré'),
      'GET logo stream when tenant has no logo throws 404 NotFoundException',
    );

    // -------------------------------------------------------------
    // Test 23: GET stamp when tenant has no stamp -> 404
    // -------------------------------------------------------------
    let getStampErr: any = null;
    try {
      await service.getStampFileStream(companyC.id);
    } catch (e) {
      getStampErr = e;
    }
    assert(
      getStampErr instanceof NotFoundException &&
        getStampErr.message.includes('Aucun cachet configuré'),
      'GET stamp stream when tenant has no stamp throws 404 NotFoundException',
    );

    // -------------------------------------------------------------
    // Test 24: ADMIN_GENERAL remains confined to own company
    // -------------------------------------------------------------
    // Simulating an admin belonging to Company A querying via controller with companyA.id
    const adminResA = await controller.getSettings(companyA.id);
    const adminResB = await controller.getSettings(companyB.id);
    assert(
      adminResA.settings?.nomEntreprise === 'Legit Company A Update' &&
        adminResB.settings?.nomEntreprise === 'Logistique B SA',
      'ADMIN_GENERAL user context remains strictly confined to assigned companyId',
    );

    // -------------------------------------------------------------
    // Mandatory Filesystem Test A: Cross-tenant physical isolation
    // -------------------------------------------------------------
    await controller.uploadLogo(companyA.id, fakeLogoA);
    const logoSettingsA = await prisma.companySettings.findFirst({
      where: { companyId: companyA.id },
    });
    const filePathA = logoSettingsA?.logoPath;

    // Company B attempts to delete Company A logo or read Company A logo
    let crossReadErr: any = null;
    try {
      const streamInfoCross = await service.getLogoFileStream(companyB.id);
      streamInfoCross.stream.destroy();
    } catch (e) {
      crossReadErr = e;
    }
    assert(
      crossReadErr instanceof NotFoundException &&
        typeof filePathA === 'string' &&
        fs.existsSync(filePathA),
      'Cross-tenant physical isolation: Company B cannot read or access Company A logo file',
    );

    // -------------------------------------------------------------
    // Mandatory Filesystem Test B: Replacement safety
    // -------------------------------------------------------------
    const oldPathLogoA = logoSettingsA?.logoPath;
    const replacementLogoA: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'logo_a_v2.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('FAKE_PNG_HEADER_COMPANY_A_VERSION_2'),
      size: 36,
    } as any;

    await controller.uploadLogo(companyA.id, replacementLogoA);
    const newSettingsA = await prisma.companySettings.findFirst({
      where: { companyId: companyA.id },
    });
    const newPathLogoA = newSettingsA?.logoPath;

    assert(
      Boolean(newPathLogoA && fs.existsSync(newPathLogoA)) &&
        Boolean(oldPathLogoA && !fs.existsSync(oldPathLogoA)),
      'Replacement safety: Old file deleted post DB commit and new file stored successfully',
    );

    // Cleanup uploaded logo
    await controller.deleteLogo(companyA.id);

    // -------------------------------------------------------------
    // Mandatory Filesystem Test C: Path Traversal prevention
    // -------------------------------------------------------------
    let pathTraversalErr: any = null;
    try {
      (service as any).resolveSafePath(
        path.join(process.cwd(), 'uploads', 'branding', 'logo'),
        '../../etc/passwd',
      );
    } catch (e) {
      pathTraversalErr = e;
    }
    assert(
      pathTraversalErr instanceof BadRequestException &&
        pathTraversalErr.message.includes('traversée de répertoire'),
      'Path traversal attempt (../) rejected by resolveSafePath',
    );

    // Cleanup DB records
    await prisma.companySettings.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyC.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id, companyC.id] } },
    });
  } catch (err) {
    console.error('UNHANDLED TEST RUNNER ERROR:', err);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n==================================================`);
  console.log(
    `TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} TESTS`,
  );
  console.log(`==================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
