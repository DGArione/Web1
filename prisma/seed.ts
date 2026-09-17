import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(s: string) {
  return bcrypt.hash(s, 10);
}

async function main() {
  console.log("Seeding database…");

  // --- Settings (§18, §29) ---------------------------------------------------
  const settings: Record<string, string> = {
    payment_method: "BOTH",
    payment_terms: "IMMEDIATE",
    credit_days: "14",
    settlement_days: "14",
    bank_name: "Bank of Ceylon",
    bank_account_name: "Ceylon Tea Traders (Pvt) Ltd",
    bank_account_number: "0001234567",
    bank_branch: "Colombo Main",
    bank_instructions: "Use your order ID as the payment reference.",
    crypto_currency: "USDT",
    crypto_network: "TRC20",
    crypto_address: "TXYZexampleAddressDoNotSend000000000000",
    crypto_instructions: "Send the exact amount and submit the transaction hash.",
    default_seller_reg_fee: "50",
    expire_order_info_seconds: "86400",
    invite_expiry_hours: "72",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  // --- Seller levels (§4, §5) ------------------------------------------------
  const levelData = [
    { name: "Bronze", rank: 1, minSales: 0, minPoints: 0, commissionPct: 10, registrationFee: 50, canRecruit: false, creditAllowed: false, creditDays: 0, inactivityDays: 90 },
    { name: "Silver", rank: 2, minSales: 5000, minPoints: 50, commissionPct: 8, registrationFee: 100, canRecruit: true, creditAllowed: true, creditDays: 14, inactivityDays: 120 },
    { name: "Gold", rank: 3, minSales: 15000, minPoints: 150, commissionPct: 6, registrationFee: 200, canRecruit: true, creditAllowed: true, creditDays: 30, inactivityDays: 180 },
  ];
  const levels: Record<string, string> = {};
  for (const l of levelData) {
    const level = await prisma.sellerLevel.upsert({
      where: { rank: l.rank },
      create: l,
      update: l,
    });
    levels[l.name] = level.id;
    await prisma.policy.upsert({
      where: { levelId: level.id },
      create: {
        levelId: level.id,
        version: 1,
        content:
          `# ${l.name} Level Policy\n\n` +
          `- Platform commission: ${l.commissionPct}%\n` +
          `- Minimum qualifying sales: $${l.minSales}\n` +
          `- Credit period: ${l.creditAllowed ? l.creditDays + " days" : "not available"}\n` +
          `- Seller recruitment: ${l.canRecruit ? "permitted" : "not permitted"}\n\n` +
          `Sellers are responsible for verifying customer payments and honouring collection commitments.`,
      },
      update: {},
    });
  }

  // --- Commission brackets by price (§14) ------------------------------------
  await prisma.commissionBracket.deleteMany();
  await prisma.commissionBracket.createMany({
    data: [
      { minPrice: 0, maxPrice: 10, pct: 5 },
      { minPrice: 10, maxPrice: 20, pct: 7 },
      { minPrice: 20, maxPrice: 50, pct: 8 },
      { minPrice: 50, maxPrice: null, pct: 10 },
    ],
  });

  // --- Administrator (§3) ----------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@teatraders.example" },
    create: {
      role: "ADMIN",
      name: "Platform Administrator",
      email: "admin@teatraders.example",
      passwordHash: await hash("admin1234"),
      recoveryHash: await hash("recover-admin"),
      status: "ACTIVE",
    },
    update: {},
  });

  // --- Demo Gold master seller (reports to admin) ---------------------------
  const gold = await prisma.user.upsert({
    where: { email: "gold@teatraders.example" },
    create: {
      role: "SELLER",
      name: "Nimal (Gold Master)",
      email: "gold@teatraders.example",
      passwordHash: await hash("seller1234"),
      recoveryHash: await hash("recover-gold"),
      status: "ACTIVE",
      levelId: levels["Gold"],
      masterId: admin.id,
      points: 180,
      totalSales: 16000,
    },
    update: {},
  });

  // --- Demo Bronze seller (reports to gold) ----------------------------------
  const bronze = await prisma.user.upsert({
    where: { email: "bronze@teatraders.example" },
    create: {
      role: "SELLER",
      name: "Kamala (Bronze)",
      email: "bronze@teatraders.example",
      passwordHash: await hash("seller1234"),
      recoveryHash: await hash("recover-bronze"),
      status: "ACTIVE",
      levelId: levels["Bronze"],
      masterId: gold.id,
      points: 20,
      totalSales: 1200,
    },
    update: {},
  });

  // --- Demo customer (reports to bronze) -------------------------------------
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    create: {
      role: "CUSTOMER",
      name: "Sanduni (Customer)",
      email: "customer@example.com",
      passwordHash: await hash("customer1234"),
      status: "ACTIVE",
      masterId: bronze.id,
    },
    update: {},
  });

  // --- Demo products (§13) ---------------------------------------------------
  const productSpecs = [
    { sellerId: bronze.id, name: "Ceylon Black Tea 250g", code: "CBT-250", price: 12, stock: 40, description: "High-grown single-origin black tea." },
    { sellerId: bronze.id, name: "Green Tea 100g", code: "GT-100", price: 8, stock: 60, description: "Delicate green tea leaves." },
    { sellerId: gold.id, name: "Premium Silver Tips 50g", code: "PST-050", price: 65, stock: 15, description: "Rare hand-picked silver tips." },
  ];
  for (const p of productSpecs) {
    const existing = await prisma.product.findFirst({ where: { code: p.code, sellerId: p.sellerId } });
    if (!existing) await prisma.product.create({ data: p });
  }

  console.log("Seed complete.\n");
  console.log("Login accounts:");
  console.log("  Admin    : admin@teatraders.example / admin1234");
  console.log("  Seller   : gold@teatraders.example / seller1234 (Gold master)");
  console.log("  Seller   : bronze@teatraders.example / seller1234 (Bronze)");
  console.log("  Customer : customer@example.com / customer1234");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
