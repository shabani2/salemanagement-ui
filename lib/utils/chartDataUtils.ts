import { MouvementStock } from '@/Models/mouvementStockType';
import { Stock } from '@/Models/stock';

export const getCAByMonth = (mouvements: MouvementStock[]) => {
  const monthlySales: Record<string, number> = {};

  mouvements
    .filter((m) => m.type === 'Vente')
    .forEach((mvt) => {
      const date = new Date(mvt.createdAt || '');
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlySales[month] = (monthlySales[month] || 0) + mvt.montant;
    });

  return {
    labels: Object.keys(monthlySales),
    datasets: [
      {
        label: 'Chiffre d’affaires',
        data: Object.values(monthlySales),
        backgroundColor: '#4ade80',
        borderColor: '#22c55e',
        tension: 0.4,
        fill: true,
      },
    ],
  };
};

export const getSalesByRegion = (mouvements: MouvementStock[]) => {
  const salesByRegion: Record<string, number> = {};
  mouvements
    .filter((m) => m.type === 'Vente')
    .forEach((mvt) => {
      let region = 'Inconnu';
      if (
        mvt.pointVente?.region &&
        typeof mvt.pointVente.region === 'object' &&
        'nom' in mvt.pointVente.region
      ) {
        region = (mvt.pointVente.region as { nom: string }).nom;
      }
      salesByRegion[region] = (salesByRegion[region] || 0) + mvt.montant;
    });

  return {
    labels: Object.keys(salesByRegion),
    datasets: [
      {
        label: 'Ventes par région',
        data: Object.values(salesByRegion),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      },
    ],
  };
};

export const getStockByCategory = (stocks: Stock[]) => {
  const stockByCategory: Record<string, number> = {};
  stocks.forEach((stock) => {
    const category =
      stock.produit.categorie &&
      typeof stock.produit.categorie === 'object' &&
      'nom' in stock.produit.categorie
        ? (stock.produit.categorie as { nom: string }).nom
        : 'Autres';
    stockByCategory[category] = (stockByCategory[category] || 0) + stock.quantite;
  });

  return {
    labels: Object.keys(stockByCategory),
    datasets: [
      {
        label: 'Quantité en stock',
        data: Object.values(stockByCategory),
        backgroundColor: '#6366f1',
      },
    ],
  };
};
