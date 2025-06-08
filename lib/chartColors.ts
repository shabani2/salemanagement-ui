/* eslint-disable @typescript-eslint/no-unused-vars */
// /utils/colors.ts

export type Entity = string | number;

function hashStringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function generateHSLColor(index: number): string {
  const hue = (index * 137.508) % 360; // Golden angle separation for better distribution
  return `hsl(${hue}, 65%, 55%)`;
}

class ColorManager {
  private colorMap: Map<Entity, string> = new Map();
  private index = 0;

  getColor(entity: Entity): string {
    if (this.colorMap.has(entity)) return this.colorMap.get(entity)!;
    const color = generateHSLColor(this.index++);
    this.colorMap.set(entity, color);
    return color;
  }

  getMap(): Record<string, string> {
    return Object.fromEntries(this.colorMap);
  }
}

export function generateColorCollections({
  produits,
  categories,
  pointsVente,
  operations,
  regions,
}: {
  produits: { _id: string; nom: string }[];
  categories: { _id: string; nom: string }[];
  pointsVente: { _id: string; nom: string }[];
  operations?: string[];
  regions?: string[];
}) {
  const productColorMgr = new ColorManager();
  const categoryColorMgr = new ColorManager();
  const pointVenteColorMgr = new ColorManager();
  const operationColorMgr = new ColorManager();
  const regionColorMgr = new ColorManager();

  produits.forEach((p) => productColorMgr.getColor(p._id));
  categories.forEach((c) => categoryColorMgr.getColor(c._id));
  pointsVente.forEach((pv) => pointVenteColorMgr.getColor(pv._id));

  const typeOptions = operations ?? ['Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'];
  typeOptions.forEach((type) => operationColorMgr.getColor(type));

  if (regions) {
    regions.forEach((region) => regionColorMgr.getColor(region));
  }

  return {
    productColors: productColorMgr.getMap(),
    categoryColors: categoryColorMgr.getMap(),
    pointVenteColors: pointVenteColorMgr.getMap(),
    operationTypeColors: operationColorMgr.getMap(),
    regionColors: regionColorMgr.getMap(),
  };
}

export function getColorForEntity(entity: Entity): string {
  return new ColorManager().getColor(entity);
}
