import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

// Convert rupees to paise
function toPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

async function main() {
  console.log('--- STARTING SFTP SEEDING ---');

  // Clean existing records if any
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.event.deleteMany();
  await prisma.report.deleteMany();
  await prisma.category.deleteMany();
  await prisma.financialYear.deleteMany();
  await prisma.transparencySettings.deleteMany();
  await prisma.societyMember.deleteMany();
  await prisma.society.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing tables.');

  // 1. Create Users
  const superAdminPassword = await hash('Admin@123456');
  const userPassword = await hash('Pass@123456');

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Dr. Vikramaditya Rao (Super Admin)',
      email: 'superadmin@sftp.local',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  const techAdmin = await prisma.user.create({
    data: {
      name: 'Aarav Sharma (Society President)',
      email: 'admin@technova.org',
      passwordHash: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const facultyCoord = await prisma.user.create({
    data: {
      name: 'Prof. Sneha Deshmukh (Faculty Coordinator)',
      email: 'faculty@technova.org',
      passwordHash: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const treasurer = await prisma.user.create({
    data: {
      name: 'Rohan Mehta (Treasurer)',
      email: 'treasurer@technova.org',
      passwordHash: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const generalMember = await prisma.user.create({
    data: {
      name: 'Priya Verma (Society Member)',
      email: 'member@technova.org',
      passwordHash: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const roboAdmin = await prisma.user.create({
    data: {
      name: 'Kunal Singhania (Robotics Head)',
      email: 'admin@robotics.org',
      passwordHash: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const roboTreasurer = await prisma.user.create({
    data: {
      name: 'Ananya Roy (Robotics Treasurer)',
      email: 'treasurer@robotics.org',
      passwordHash: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  console.log('Created Users.');

  // 2. Create Societies
  const techNova = await prisma.society.create({
    data: {
      name: 'TechNova Computing Society',
      code: 'technova',
      description: 'The premier student society for computer science, software innovation, and coding competitions.',
      contactEmail: 'contact@technova.org',
      contactPhone: '+91 98765 43210',
      status: 'ACTIVE',
      transparencySettings: {
        create: {
          showTotalIncome: true,
          showTotalExpenses: true,
          showCategoryBreakdown: true,
          showEventBudgets: true,
          showTransactionLevelData: true,
          showReports: true,
          showMonthlyTrends: true,
          customDisclaimer: 'TechNova follows university audit guidelines. All figures audited quarterly by Faculty Advisory Board.',
        },
      },
    },
  });

  const roboticsGuild = await prisma.society.create({
    data: {
      name: 'Robotics & Autonomous Guild',
      code: 'robotics-guild',
      description: 'Engineering innovation society designing combat robots, quadcopters, and autonomous rover systems.',
      contactEmail: 'info@robotics.org',
      contactPhone: '+91 98111 22334',
      status: 'ACTIVE',
      transparencySettings: {
        create: {
          showTotalIncome: true,
          showTotalExpenses: true,
          showCategoryBreakdown: true,
          showEventBudgets: true,
          showTransactionLevelData: false, // tests private txn setting
          showReports: true,
          showMonthlyTrends: true,
        },
      },
    },
  });

  console.log('Created Societies and Transparency Settings.');

  // 3. Society Memberships
  await prisma.societyMember.createMany({
    data: [
      { societyId: techNova.id, userId: techAdmin.id, role: 'SOCIETY_ADMIN' },
      { societyId: techNova.id, userId: facultyCoord.id, role: 'FACULTY_COORDINATOR' },
      { societyId: techNova.id, userId: treasurer.id, role: 'TREASURER' },
      { societyId: techNova.id, userId: generalMember.id, role: 'MEMBER' },
      { societyId: roboticsGuild.id, userId: roboAdmin.id, role: 'SOCIETY_ADMIN' },
      { societyId: roboticsGuild.id, userId: roboTreasurer.id, role: 'TREASURER' },
    ],
  });

  // 4. Financial Years
  const fyTechNova = await prisma.financialYear.create({
    data: {
      societyId: techNova.id,
      name: '2026-27',
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2027-03-31T23:59:59Z'),
      isCurrent: true,
      openingBalance: toPaise(100000), // ₹1,00,000 opening balance
    },
  });

  const fyRobotics = await prisma.financialYear.create({
    data: {
      societyId: roboticsGuild.id,
      name: '2026-27',
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2027-03-31T23:59:59Z'),
      isCurrent: true,
      openingBalance: toPaise(75000), // ₹75,000 opening balance
    },
  });

  console.log('Created Financial Years.');

  // 5. Categories
  const catMembership = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Membership Fees', type: 'INCOME', description: 'Annual student society subscriptions' },
  });
  const catSponsorship = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Corporate Sponsorship', type: 'INCOME', description: 'Industry partner event sponsorships' },
  });
  const catGrant = await prisma.category.create({
    data: { societyId: techNova.id, name: 'University Allocation', type: 'INCOME', description: 'Dean of Student Affairs statutory fund' },
  });
  const catRegistration = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Event Registration', type: 'INCOME', description: 'Hackathon team ticket collections' },
  });

  const catVenue = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Venue & Catering', type: 'EXPENSE', description: 'Auditorium booking, food and refreshment' },
  });
  const catEquipment = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Hardware & Equipment', type: 'EXPENSE', description: 'Microcontrollers, screens, networking gears' },
  });
  const catMarketing = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Marketing & Publicity', type: 'EXPENSE', description: 'Posters, social ads, banners' },
  });
  const catSoftware = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Software Subscriptions', type: 'EXPENSE', description: 'Cloud hosting, GitHub Copilot, Zoom Pro' },
  });
  const catPrizes = await prisma.category.create({
    data: { societyId: techNova.id, name: 'Prizes & Trophies', type: 'EXPENSE', description: 'Cash awards and customized medals' },
  });

  // Global category
  const catGeneralBoth = await prisma.category.create({
    data: { societyId: null, name: 'Miscellaneous Operations', type: 'BOTH', description: 'General operational receipts and expenses' },
  });

  // 6. Events
  const hackTechEvent = await prisma.event.create({
    data: {
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      name: 'HackTech 2026 National Hackathon',
      description: '36-hour flagship hackathon with 500+ participants across universities.',
      startDate: new Date('2026-08-15T09:00:00Z'),
      endDate: new Date('2026-08-16T21:00:00Z'),
      organizer: 'TechNova Core Team',
      allocatedBudget: toPaise(150000), // ₹1,50,000
      status: 'ACTIVE',
    },
  });

  const aiWorkshopEvent = await prisma.event.create({
    data: {
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      name: 'GenAI & LLM Bootcamp',
      description: 'Hands-on weekend bootcamp covering agentic AI and transformers.',
      startDate: new Date('2026-09-05T10:00:00Z'),
      endDate: new Date('2026-09-06T17:00:00Z'),
      organizer: 'Aarav Sharma',
      allocatedBudget: toPaise(40000), // ₹40,000
      status: 'COMPLETED',
    },
  });

  // 7. Budgets
  await prisma.budget.createMany({
    data: [
      {
        societyId: techNova.id,
        financialYearId: fyTechNova.id,
        eventId: hackTechEvent.id,
        allocatedAmount: toPaise(150000),
        createdById: techAdmin.id,
        notes: 'Approved at executive council meeting for HackTech 2026',
      },
      {
        societyId: techNova.id,
        financialYearId: fyTechNova.id,
        categoryId: catEquipment.id,
        allocatedAmount: toPaise(60000),
        createdById: techAdmin.id,
        notes: 'Annual lab equipment and sensor restocking allocation',
      },
      {
        societyId: techNova.id,
        financialYearId: fyTechNova.id,
        categoryId: catMarketing.id,
        allocatedAmount: toPaise(25000),
        createdById: techAdmin.id,
        notes: 'Branding, banners, promotional prints',
      },
      {
        societyId: techNova.id,
        financialYearId: fyTechNova.id,
        eventId: aiWorkshopEvent.id,
        allocatedAmount: toPaise(40000),
        createdById: techAdmin.id,
        notes: 'Bootcamp logistics and speaker honorarium',
      },
    ],
  });

  console.log('Created Events and Budgets.');

  // 8. Transactions for TechNova (Exercises all statuses: APPROVED, PENDING, REJECTED, VOIDED, DRAFT)

  // Approved Incomes
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00001',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'INCOME',
      status: 'APPROVED',
      amount: toPaise(75000), // ₹75,000
      categoryId: catMembership.id,
      description: 'Collection of 150 student annual memberships for 2026-27',
      transactionDate: new Date('2026-04-12T10:30:00Z'),
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/2026/0412/10398',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-04-13T11:00:00Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00002',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'INCOME',
      status: 'APPROVED',
      amount: toPaise(120000), // ₹1,20,000
      categoryId: catGrant.id,
      description: 'Annual University technical society statutory grant disbursement',
      transactionDate: new Date('2026-05-02T14:15:00Z'),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'NEFT/UNIV/DSA/882194',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-05-03T16:00:00Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00003',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'INCOME',
      status: 'APPROVED',
      amount: toPaise(80000), // ₹80,000
      categoryId: catSponsorship.id,
      eventId: hackTechEvent.id,
      description: 'Title Tier sponsorship grant from TechCorp Cloud India',
      transactionDate: new Date('2026-07-20T11:45:00Z'),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'RTGS/TCORP/774102',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-07-21T09:30:00Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00004',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'INCOME',
      status: 'APPROVED',
      amount: toPaise(45000), // ₹45,000
      categoryId: catRegistration.id,
      eventId: hackTechEvent.id,
      description: 'Early bird registration pass fees for HackTech teams',
      transactionDate: new Date('2026-08-01T16:00:00Z'),
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/HACKTECH/REG/99812',
      createdById: treasurer.id,
      approvedById: techAdmin.id,
      approvedAt: new Date('2026-08-02T10:00:00Z'),
    },
  });

  // Approved Expenses
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00005',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'APPROVED',
      amount: toPaise(52000), // ₹52,000
      categoryId: catVenue.id,
      eventId: hackTechEvent.id,
      description: 'Main auditorium rental advance and event catering for participants',
      transactionDate: new Date('2026-08-10T12:00:00Z'),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'NEFT/CATERING/5512',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-08-11T14:00:00Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00006',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'APPROVED',
      amount: toPaise(28500), // ₹28,500
      categoryId: catEquipment.id,
      description: 'Purchase of 15 ESP32 Dev Kits, Raspberry Pis, and solder stations',
      transactionDate: new Date('2026-06-15T15:30:00Z'),
      paymentMethod: 'CARD',
      referenceNumber: 'POS/ROBOKITS/IN8829',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-06-16T11:00:00Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00007',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'APPROVED',
      amount: toPaise(14500), // ₹14,500
      categoryId: catMarketing.id,
      eventId: hackTechEvent.id,
      description: 'Printed standees, 500 vinyl stickers, and campus promotional flex banners',
      transactionDate: new Date('2026-07-28T14:00:00Z'),
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/PRINTEX/7762',
      createdById: treasurer.id,
      approvedById: techAdmin.id,
      approvedAt: new Date('2026-07-29T10:00:00Z'),
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00008',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'APPROVED',
      amount: toPaise(6800), // ₹6,800
      categoryId: catSoftware.id,
      description: 'Annual premium organization subscription for Zoom Pro & domain renewal',
      transactionDate: new Date('2026-05-10T09:00:00Z'),
      paymentMethod: 'CARD',
      referenceNumber: 'CARD/SUB/ZOOM/0019',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-05-11T12:00:00Z'),
    },
  });

  // Pending Approval (Expense)
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00009',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'PENDING_APPROVAL',
      amount: toPaise(32000), // ₹32,000
      categoryId: catPrizes.id,
      eventId: hackTechEvent.id,
      description: 'Procurement of customized crystal winner trophies and winner award plaques',
      transactionDate: new Date('2026-08-14T11:00:00Z'),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'INV/AWARDS/2026/89',
      createdById: treasurer.id,
    },
  });

  // Pending Approval (Income)
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00010',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'INCOME',
      status: 'PENDING_APPROVAL',
      amount: toPaise(20000), // ₹20,000
      categoryId: catRegistration.id,
      eventId: aiWorkshopEvent.id,
      description: 'On-spot participant pass collections for GenAI workshop',
      transactionDate: new Date('2026-09-05T09:30:00Z'),
      paymentMethod: 'CASH',
      referenceNumber: 'RECEIPT/SERIES-B/01-40',
      createdById: treasurer.id,
    },
  });

  // Rejected Transaction
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00011',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'REJECTED',
      amount: toPaise(18500),
      categoryId: catVenue.id,
      description: 'Executive committee dinner at 5-star hotel',
      transactionDate: new Date('2026-07-15T21:00:00Z'),
      paymentMethod: 'CARD',
      referenceNumber: 'CARD/RESTAURANT/9981',
      createdById: treasurer.id,
      rejectionReason: 'Exceeds per-diem policy; luxury dining is strictly non-reimbursable under University Student Society regulations.',
    },
  });

  // Voided Transaction
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00012',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'VOIDED',
      amount: toPaise(4500),
      categoryId: catMarketing.id,
      description: 'Duplicate poster printing invoice mistakenly submitted twice',
      transactionDate: new Date('2026-07-25T11:00:00Z'),
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/DUPLICATE/1298',
      createdById: treasurer.id,
      approvedById: facultyCoord.id,
      approvedAt: new Date('2026-07-26T10:00:00Z'),
      voidReason: 'Discovered duplicate payment voucher; vendor refunded and transaction canceled.',
      voidedById: facultyCoord.id,
      voidedAt: new Date('2026-07-27T15:00:00Z'),
    },
  });

  // Draft Transaction
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-2026-00013',
      societyId: techNova.id,
      financialYearId: fyTechNova.id,
      type: 'EXPENSE',
      status: 'DRAFT',
      amount: toPaise(9500),
      categoryId: catEquipment.id,
      description: 'Proposed purchase of USB logic analyzers for embedded lab',
      transactionDate: new Date(),
      paymentMethod: 'BANK_TRANSFER',
      createdById: treasurer.id,
    },
  });

  console.log('Created All Sample Transactions.');

  // 9. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: facultyCoord.id,
        societyId: techNova.id,
        type: 'APPROVAL_REQUEST',
        title: 'Pending Transaction Approval',
        message: 'TXN-2026-00009: Trophy procurement (₹32,000) awaits your review.',
        link: '/approvals',
        read: false,
      },
      {
        userId: techAdmin.id,
        societyId: techNova.id,
        type: 'APPROVAL_REQUEST',
        title: 'New Income Receipt Submitted',
        message: 'TXN-2026-00010: AI Workshop cash collection (₹20,000) submitted by Treasurer.',
        link: '/approvals',
        read: false,
      },
      {
        userId: treasurer.id,
        societyId: techNova.id,
        type: 'APPROVAL_GRANTED',
        title: 'Transaction Approved',
        message: 'TXN-2026-00007: Marketing flex banners (₹14,500) has been approved.',
        link: '/transactions',
        read: true,
      },
    ],
  });

  // 10. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        societyId: techNova.id,
        userId: techAdmin.id,
        action: 'SOCIETY_CREATE',
        entityType: 'SOCIETY',
        entityId: techNova.id,
        newData: JSON.stringify({ name: techNova.name, code: techNova.code }),
      },
      {
        societyId: techNova.id,
        userId: treasurer.id,
        action: 'TRANSACTION_CREATE',
        entityType: 'TRANSACTION',
        entityId: 'TXN-2026-00001',
        newData: JSON.stringify({ amount: '7500000', type: 'INCOME', description: 'Membership Fees' }),
      },
      {
        societyId: techNova.id,
        userId: facultyCoord.id,
        action: 'TRANSACTION_APPROVE',
        entityType: 'TRANSACTION',
        entityId: 'TXN-2026-00001',
        oldData: JSON.stringify({ status: 'PENDING_APPROVAL' }),
        newData: JSON.stringify({ status: 'APPROVED' }),
      },
      {
        societyId: techNova.id,
        userId: facultyCoord.id,
        action: 'TRANSACTION_REJECT',
        entityType: 'TRANSACTION',
        entityId: 'TXN-2026-00011',
        newData: JSON.stringify({ status: 'REJECTED', reason: 'Exceeds per-diem policy' }),
      },
      {
        societyId: techNova.id,
        userId: facultyCoord.id,
        action: 'TRANSACTION_VOID',
        entityType: 'TRANSACTION',
        entityId: 'TXN-2026-00012',
        newData: JSON.stringify({ status: 'VOIDED', reason: 'Discovered duplicate payment' }),
      },
    ],
  });

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
