import { IResolution } from '@src/models/Resolution';
import { IActivite } from '@src/models/Activite';

export class ResolutionService {
  /**
   * Calcule la note pour un QCM.
   */
  public static calculerNoteQCM(resolution: IResolution, activite: IActivite): number {
    if (activite.categorie !== 'QCM' || !activite.qcm || activite.qcm.length === 0) {
      return 0;
    }

    let correctAnswers = 0;
    const totalQuestions = activite.qcm.length;

    console.log('[ResolutionService] reponses_qcm:', resolution.reponses_qcm);

    for (const reponseUser of resolution.reponses_qcm) {
      const question = activite.qcm.find(q => {
        const qObj = q as unknown as { _id?: { toString(): string }; enonce: string; reponse: string };
        return qObj._id?.toString() === reponseUser.qcm_id || qObj.enonce === reponseUser.qcm_id;
      });
      console.log('[ResolutionService] question:', question);
      if (question && (question as unknown as { reponse: string }).reponse === reponseUser.reponse) {
        console.log('[ResolutionService] correct answer:', reponseUser.reponse);
        console.log('[ResolutionService] correct answer:', (question as unknown as { reponse: string }).reponse);
        correctAnswers++;
      }
    }

    const score = (correctAnswers / totalQuestions) * activite.note_maximale;
    console.log('[ResolutionService] score:', score);
    console.log('[ResolutionService] correctAnswers:', correctAnswers);
    return score;
  }

  /**
   * Corrige automatiquement un QCM et renvoie la note arrondie à 2 décimales.
   */
  public static corrigerQcmAutomatiquement(resolution: IResolution, activite: IActivite): number {
    const brute = this.calculerNoteQCM(resolution, activite);
    return Math.round(brute * 100) / 100;
  }
}
