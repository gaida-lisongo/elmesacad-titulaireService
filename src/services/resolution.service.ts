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

    for (const reponseUser of resolution.reponses_qcm) {
      const question = activite.qcm.find(q => q._id?.toString() === reponseUser.qcm_id || q.enonce === reponseUser.qcm_id);
      if (question && question.reponse === reponseUser.reponse) {
        correctAnswers++;
      }
    }

    const score = (correctAnswers / totalQuestions) * activite.note_maximale;
    return score;
  }
}
