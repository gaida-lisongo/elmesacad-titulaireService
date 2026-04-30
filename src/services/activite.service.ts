import { IActivite } from '@src/models/Activite';

type SafeQcm = {
  _id?: unknown;
  enonce: string;
  options: string[];
};

type SafeActivite = Omit<IActivite, 'qcm'> & {
  qcm: SafeQcm[];
};

export class ActiviteService {
  /**
   * Retire les réponses correctes des QCM avant envoi au client étudiant.
   */
  public static sanitizeForStudent<T extends IActivite | (Record<string, unknown> & { qcm?: unknown[] })>(
    activite: T,
  ): SafeActivite {
    const rawQcm = Array.isArray(activite.qcm) ? activite.qcm : [];
    const qcm = rawQcm.map((item) => {
      const q = item as { _id?: unknown; enonce?: unknown; options?: unknown };
      return {
        _id: q._id,
        enonce: typeof q.enonce === 'string' ? q.enonce : '',
        options: Array.isArray(q.options)
          ? q.options.filter((opt): opt is string => typeof opt === 'string')
          : [],
      };
    });

    return {
      ...(activite as unknown as Record<string, unknown>),
      qcm,
    } as unknown as SafeActivite;
  }
}
