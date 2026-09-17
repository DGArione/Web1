import { prisma } from "./db";

/**
 * System settings (proposal §18, §29). Stored as key/value strings and parsed
 * on read. Defaults are applied when a key is missing.
 */
export const SETTING_KEYS = {
  // Payment method: "BANK" | "CRYPTO" | "BOTH"
  PAYMENT_METHOD: "payment_method",
  // Payment terms: "IMMEDIATE" | "CREDIT"
  PAYMENT_TERMS: "payment_terms",
  CREDIT_DAYS: "credit_days",
  SETTLEMENT_DAYS: "settlement_days",

  // Bank transfer details (§16)
  BANK_NAME: "bank_name",
  BANK_ACCOUNT_NAME: "bank_account_name",
  BANK_ACCOUNT_NUMBER: "bank_account_number",
  BANK_BRANCH: "bank_branch",
  BANK_INSTRUCTIONS: "bank_instructions",

  // Crypto details (§17)
  CRYPTO_CURRENCY: "crypto_currency",
  CRYPTO_NETWORK: "crypto_network",
  CRYPTO_ADDRESS: "crypto_address",
  CRYPTO_INSTRUCTIONS: "crypto_instructions",

  // Registration
  DEFAULT_SELLER_REG_FEE: "default_seller_reg_fee",

  // Temporary-data expiration, in seconds (§22, §23)
  EXPIRE_ORDER_INFO_SECONDS: "expire_order_info_seconds",

  // Invitation default lifetime, in hours (§9, §10)
  INVITE_EXPIRY_HOURS: "invite_expiry_hours",
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.PAYMENT_METHOD]: "BOTH",
  [SETTING_KEYS.PAYMENT_TERMS]: "IMMEDIATE",
  [SETTING_KEYS.CREDIT_DAYS]: "14",
  [SETTING_KEYS.SETTLEMENT_DAYS]: "14",
  [SETTING_KEYS.BANK_NAME]: "",
  [SETTING_KEYS.BANK_ACCOUNT_NAME]: "",
  [SETTING_KEYS.BANK_ACCOUNT_NUMBER]: "",
  [SETTING_KEYS.BANK_BRANCH]: "",
  [SETTING_KEYS.BANK_INSTRUCTIONS]: "",
  [SETTING_KEYS.CRYPTO_CURRENCY]: "USDT",
  [SETTING_KEYS.CRYPTO_NETWORK]: "TRC20",
  [SETTING_KEYS.CRYPTO_ADDRESS]: "",
  [SETTING_KEYS.CRYPTO_INSTRUCTIONS]: "",
  [SETTING_KEYS.DEFAULT_SELLER_REG_FEE]: "0",
  [SETTING_KEYS.EXPIRE_ORDER_INFO_SECONDS]: "86400", // 24h
  [SETTING_KEYS.INVITE_EXPIRY_HOURS]: "72",
};

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettingNumber(key: string): Promise<number> {
  const val = await getSetting(key);
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
