export function getPackInfo(product, upp) {
  const perPack = Math.max(1, Number(upp ?? product?.units_per_pack) || 1);
  return {
    enabled: Number(product?.allow_loose) === 1 && perPack > 1,
    perPack,
    packLabel: product?.pack_type || "strip",
    looseLabel: product?.loose_unit || "tablet",
  };
}

const plural = (n, word) => (n === 1 || word === "ml" ? word : `${word}s`);

// 53 tablets, pack of 10 -> "5 strips + 3 tablets"
export function formatStock(totalUnits, product, upp) {
  const total = Number(totalUnits) || 0;
  const { enabled, perPack, packLabel, looseLabel } = getPackInfo(product, upp);
  if (!enabled) return String(total);

  const packs = Math.floor(total / perPack);
  const loose = Math.round((total - packs * perPack) * 1000) / 1000;
  const parts = [];
  if (packs > 0) parts.push(`${packs} ${plural(packs, packLabel)}`);
  if (loose > 0 || packs === 0)
    parts.push(`${loose} ${plural(loose, looseLabel)}`);
  return parts.join(" + ");
}
