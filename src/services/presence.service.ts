import { Seance } from '@src/models/Seance';
import { IPresence } from '@src/models/Presence';
import EnvVars from '@src/common/constants/env';

export class PresenceService {
  /**
   * Calcule la distance entre deux points (Haversine)
   */
  public static calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  /**
   * Détermine le statut de présence en fonction de l'heure et de la localisation
   */
  public static determinerStatut(
    seance: any,
    lat: number,
    lon: number,
    now: Date = new Date()
  ): { status: IPresence['status']; distance: number; message: string } {
    const distance = this.calculerDistance(lat, lon, EnvVars.InbtpLat, EnvVars.InbtpLong);
    const tolerance = EnvVars.LocationTolerance;

    if (distance > tolerance) {
      return {
        status: 'absent',
        distance,
        message: `Trop loin de l'établissement (${Math.round(distance)}m).`,
      };
    }

    // Calcul du retard (ex: si plus de 15 min après heure_debut)
    // On suppose heure_debut au format "HH:mm"
    const [heures, minutes] = seance.heure_debut.split(':').map(Number);
    const debutSeance = new Date(seance.date);
    debutSeance.setHours(heures, minutes, 0);

    const diffMinutes = (now.getTime() - debutSeance.getTime()) / (1000 * 60);

    if (diffMinutes > 15) {
      return {
        status: 'late',
        distance,
        message: `Présence validée avec retard (${Math.round(diffMinutes)} min).`,
      };
    }

    return {
      status: 'present',
      distance,
      message: 'Présence validée !',
    };
  }
}
