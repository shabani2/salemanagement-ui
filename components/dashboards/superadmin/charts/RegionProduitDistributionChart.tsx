import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Stock } from '@/Models/stock';
import { Region } from '@/Models/regionTypes';

interface RegionProduitDistributionChartProps {
  stocks: Stock[];
  region?: Region;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function RegionProduitDistributionChart({
  stocks,
  region,
}: RegionProduitDistributionChartProps) {
  // Agrégation des produits par quantité
  const produitMap: Record<string, number> = {};

  stocks.forEach((stock) => {
    // const produitId = stock.produit?._id || 'unknown';
    const produitNom = stock.produit?.nom || 'Inconnu';

    if (!produitMap[produitNom]) {
      produitMap[produitNom] = 0;
    }
    produitMap[produitNom] += stock.quantite;
  });

  const data = Object.entries(produitMap).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="w-full h-[300px]">
      <h2 className="text-center font-semibold">
        {region ? `Répartition dans ${region.nom}` : 'Répartition des produits'}
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
