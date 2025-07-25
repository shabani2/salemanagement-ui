// import { MouvementStock } from '@/Models/mouvementStockType';
// import { PointVente } from '@/Models/pointVenteType';
// import { Region, RegionStats } from '@/Models/regionTypes';
// type OperationType = 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';
// const isValidOperationType = (type: string): type is OperationType => {
//   return ['Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'].includes(type);
// };

import { MouvementStock } from '@/Models/mouvementStockType';
import { Region } from '@/Models/regionTypes';

// /**
//  * Calcule les statistiques agrégées par région à partir des mouvements de stock.
//  */
// export const computeRegionStats = (data: MouvementStock[]): RegionStats[] => {
//   const regionMap = new Map<
//     string,
//     RegionStats & { pointVentesSet: Set<string>; produitsSet: Set<string> }
//   >();

//   data.forEach((item) => {
//     // Vérification que la région existe
//     if (
//       !item.pointVente?.region ||
//       typeof item.pointVente.region !== 'object' ||
//       !('nom' in item.pointVente.region)
//     ) {
//       return;
//     }

//     const regionName = item.pointVente.region.nom;

//     // Initialisation si la région n'existe pas encore
//     if (!regionMap.has(regionName)) {
//       regionMap.set(regionName, {
//         region: regionName,
//         nombrepointvente: 0,
//         nombreproduit: 0,
//         Entrée: 0,
//         Sortie: 0,
//         Vente: 0,
//         Livraison: 0,
//         Commande: 0,
//         pointVentesSet: new Set<string>(),
//         produitsSet: new Set<string>(),
//       });
//     }

//     const stats = regionMap.get(regionName)!;

//     // Ajout du point de vente (uniquement s'il a un _id)
//     if (item.pointVente?._id) {
//       stats.pointVentesSet.add(item.pointVente._id.toString());
//     }

//     // Ajout du produit (en utilisant son _id)
//     if (item.produit && item.produit._id) {
//       stats.produitsSet.add(item.produit._id.toString());
//     }

//     // Agrège les montants selon le type d'opération
//     if (isValidOperationType(item.type)) {
//       stats[item.type] += Number(item.montant) || 0;
//     }
//   });

//   // Conversion finale en tableau plat
//   const result: RegionStats[] = [];

//   regionMap.forEach((value, key) => {
//     result.push({
//       region: key,
//       nombrepointvente: value.pointVentesSet.size,
//       nombreproduit: value.produitsSet.size,
//       Entrée: value.Entrée,
//       Sortie: value.Sortie,
//       Vente: value.Vente,
//       Livraison: value.Livraison,
//       Commande: value.Commande,
//     });
//   });

//   return result;
// };

// export const computeDistributionStats = (
//   data: MouvementStock[],
//   operationType: 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande',
//   userRole: 'SuperAdmin' | 'AdminRegion' ,
//   region?: Region,
//   pointVente?: PointVente
// ): { label: string; value: number }[] => {
//   const map = new Map<string, number>();

//   data.forEach((item) => {
//     if (!item.pointVente || item.type !== operationType) return;

//     const itemRegion = item.pointVente.region;
//     const itemRegionId = typeof itemRegion === 'object' ? itemRegion?._id : itemRegion;
//     const regionName = typeof itemRegion === 'object' ? itemRegion?.nom : undefined;
//     const pvName = item.pointVente.nom;
//     const pvId = item.pointVente._id;

//     if (userRole === 'SuperAdmin') {
//       if (regionName) {
//         map.set(regionName, (map.get(regionName) || 0) + item.montant);
//       }
//     } else if (userRole === 'AdminRegion') {
//       if (region?._id && region?._id === itemRegionId) {
//         map.set(pvName, (map.get(pvName) || 0) + item.montant);
//       }
//     } else if (userRole === 'AdminPointVente') {
//       if (pointVente?._id && pointVente._id === pvId) {
//         map.set(pvName, (map.get(pvName) || 0) + item.montant);
//       }
//     }
//   });
//   console.log(
//     'data convert : ',
//     Array.from(map.entries()).map(([label, value]) => ({ label, value }))
//   );
//   return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
// };

interface RegionStatsSuperAdmin {
  role: 'SuperAdmin';
  region: string;
  nombrepointvente: number;
  nombreproduit: number;
  Entrée: number;
  Sortie: number;
  Vente: number;
  Livraison: number;
  Commande: number;
}

interface PointVenteStats {
  pointVenteId: string;
  nom: string;
  nombreproduit: number;
  Entrée: number;
  Sortie: number;
  Vente: number;
  Livraison: number;
  Commande: number;
}

interface RegionStatsAdminRegion {
  role: 'AdminRegion';
  region: string;
  pointVentes: PointVenteStats[];
}

type ComputeRegionStatsResult = RegionStatsSuperAdmin[] | RegionStatsAdminRegion[];
type OperationType = 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';

const isValidOperationType = (type: string): type is OperationType => {
  return ['Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'].includes(type);
};

export const computeRegionStats = (
  data: MouvementStock[],
  userRole: 'SuperAdmin' | 'AdminRegion',
  regionFilter?: Region
): ComputeRegionStatsResult => {
  if (userRole === 'SuperAdmin') {
    const regionMap = new Map<
      string,
      RegionStatsSuperAdmin & { pointVentesSet: Set<string>; produitsSet: Set<string> }
    >();

    data.forEach((item) => {
      if (
        !item.pointVente?.region ||
        typeof item.pointVente.region !== 'object' ||
        !('nom' in item.pointVente.region)
      ) {
        return;
      }

      const regionName = item.pointVente.region.nom;

      if (!regionMap.has(regionName)) {
        regionMap.set(regionName, {
          role: 'SuperAdmin',
          region: regionName,
          nombrepointvente: 0,
          nombreproduit: 0,
          Entrée: 0,
          Sortie: 0,
          Vente: 0,
          Livraison: 0,
          Commande: 0,
          pointVentesSet: new Set<string>(),
          produitsSet: new Set<string>(),
        });
      }

      const stats = regionMap.get(regionName)!;

      if (item.pointVente?._id) {
        stats.pointVentesSet.add(item.pointVente._id.toString());
      }

      if (item.produit && item.produit._id) {
        stats.produitsSet.add(item.produit._id.toString());
      }

      if (isValidOperationType(item.type)) {
        stats[item.type] += Number(item.montant) || 0;
      }
    });

    return Array.from(regionMap.values()).map((value) => ({
      role: 'SuperAdmin',
      region: value.region,
      nombrepointvente: value.pointVentesSet.size,
      nombreproduit: value.produitsSet.size,
      Entrée: value.Entrée,
      Sortie: value.Sortie,
      Vente: value.Vente,
      Livraison: value.Livraison,
      Commande: value.Commande,
    }));
  }

  // Pour AdminRegion : stats par point de vente dans la région donnée
  if (!regionFilter?._id) return [];

  const pvMap = new Map<string, PointVenteStats & { produitsSet: Set<string> }>();

  data.forEach((item) => {
    const regionId =
      typeof item.pointVente?.region === 'object'
        ? item.pointVente.region._id
        : item.pointVente?.region;

    if (!item.pointVente || regionId !== regionFilter._id) return;

    const pvId = item.pointVente._id;
    const pvName = item.pointVente.nom;

    if (!pvMap.has(pvId)) {
      pvMap.set(pvId, {
        pointVenteId: pvId,
        nom: pvName,
        nombreproduit: 0,
        Entrée: 0,
        Sortie: 0,
        Vente: 0,
        Livraison: 0,
        Commande: 0,
        produitsSet: new Set<string>(),
      });
    }

    const pvStats = pvMap.get(pvId)!;

    if (item.produit && item.produit._id) {
      pvStats.produitsSet.add(item.produit._id.toString());
    }

    if (isValidOperationType(item.type)) {
      pvStats[item.type] += Number(item.montant) || 0;
    }
  });

  const pointVentes: PointVenteStats[] = Array.from(pvMap.values()).map((pv) => ({
    pointVenteId: pv.pointVenteId,
    nom: pv.nom,
    nombreproduit: pv.produitsSet.size,
    Entrée: pv.Entrée,
    Sortie: pv.Sortie,
    Vente: pv.Vente,
    Livraison: pv.Livraison,
    Commande: pv.Commande,
  }));

  return [
    {
      role: 'AdminRegion',
      region: regionFilter.nom,
      pointVentes,
    },
  ];
};
