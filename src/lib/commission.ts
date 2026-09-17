import { prisma } from "./db";

/**
 * Resolve the applicable commission percentage for a sale (proposal §14, §19).
 *
 * Rule: Seller Level + Product Price Range => Applicable Platform Commission.
 * We look for a price bracket that contains the sale amount; if none matches,
 * we fall back to the seller level's commission percentage.
 */
export async function resolveCommissionPct(
  saleAmount: number,
  levelCommissionPct: number
): Promise<number> {
  const brackets = await prisma.commissionBracket.findMany({
    orderBy: { minPrice: "asc" },
  });
  for (const b of brackets) {
    const withinLower = saleAmount >= b.minPrice;
    const withinUpper = b.maxPrice == null || saleAmount < b.maxPrice;
    if (withinLower && withinUpper) return b.pct;
  }
  return levelCommissionPct;
}

export function commissionDue(saleAmount: number, pct: number): number {
  return Math.round(saleAmount * (pct / 100) * 100) / 100;
}
