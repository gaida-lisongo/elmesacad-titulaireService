export interface ElementNote {
  _id: string; // reference de la matiere
  designation: string;
  credit: number;
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
}

export interface UniteNote {
  _id: string; // reference de l'unite
  code: string;
  designation: string;
  credit: number;
  elements: ElementNote[];
}

export interface SemestreNote {
  _id: string; // reference du semestre
  designation: string;
  credit: number;
  unites: UniteNote[];
}

export interface NotesEtudiant {
  studentId: string;
  studentName: string;
  matricule: string;
  semestres: SemestreNote[];
}

export type SessionType = "principale" | "rattrapage" | "best";

const SESSION_TYPES: SessionType[] = ["principale", "rattrapage", "best"];

export interface SessionStats {
  moyenne: number;
  isValide: boolean;
}

export interface SessionSummary {
  ncv: number;
  ncnv: number;
  totalObtenu: number;
  totalMax: number;
  pourcentage: number;
  mention: string;
}

export interface ElementResultat {
  _id: string;
  designation: string;
  credit: number;
  cc: number;
  examen: number;
  noteSession: number;
  rattrapage: number;
  rachat: number;
  noteFinale: number;
}

export interface UniteResultat {
  _id: string;
  code: string;
  designation: string;
  credit: number;
  moyenne: number;
  isValide: boolean;
  sessions: Record<SessionType, SessionStats>;
  elements: ElementResultat[];
}

export interface SemestreResultat {
  _id: string;
  designation: string;
  credit: number;
  ncv: number;
  ncnv: number;
  totalObtenu: number;
  totalMax: number;
  pourcentage: number;
  mention: string;
  unites: UniteResultat[];
  sessions: Record<SessionType, SessionSummary>;
}

export interface PromotionResultat {
  totalObtenu: number;
  totalMax: number;
  pourcentage: number;
  mention: string;
  ncv: number;
  ncnv: number;
  sessions: Record<SessionType, SessionSummary>;
}

export interface ResultatEtudiant {
  studentId: string;
  studentName: string;
  matricule: string;
  semestres: SemestreResultat[];
  promotion: PromotionResultat;
}

type SessionAccumulator = {
  ncv: number;
  ncnv: number;
  totalObtenu: number;
  totalMax: number;
};

type SessionMoyenneAccumulator = {
  points: number;
  credits: number;
};

type SessionCreditMap = Record<SessionType, number>;

export class NoteManager {
  private static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private static getMention(pourcentage: number): string {
    if (pourcentage >= 90) return "A";
    if (pourcentage >= 80) return "B";
    if (pourcentage >= 70) return "C";
    if (pourcentage >= 60) return "D";
    if (pourcentage >= 50) return "E";
    return "F";
  }

  private static buildElementScores(element: ElementNote) {
    const noteCC = element.cc ?? 0;
    const noteExamen = element.examen ?? 0;
    const noteRattrapage = element.rattrapage ?? 0;
    const noteRachat = element.rachat ?? 0;

    const noteSession = this.round(noteCC + noteExamen);
    const noteFinale = noteRachat > 0
      ? this.round(noteRachat)
      : this.round(Math.max(noteSession, noteRattrapage));

    return {
      noteSession,
      noteRattrapage: this.round(noteRattrapage),
      noteRachat: this.round(noteRachat),
      noteFinale,
    };
  }

  private static calculerMoyenneUnite(unite: UniteNote): {
    sessions: Record<SessionType, SessionStats>;
    elements: ElementResultat[];
  } {
    const elements = unite.elements ?? [];

    if (elements.length === 0) {
      const emptySessions = SESSION_TYPES.reduce(
        (acc, type) => ({ ...acc, [type]: { moyenne: 0, isValide: false } }),
        {} as Record<SessionType, SessionStats>,
      );

      return {
        sessions: emptySessions,
        elements: [],
      };
    }

    const accumulators: Record<SessionType, SessionMoyenneAccumulator> = SESSION_TYPES.reduce(
      (acc, type) => ({
        ...acc,
        [type]: { points: 0, credits: 0 },
      }),
      {} as Record<SessionType, SessionMoyenneAccumulator>,
    );

    const elementsResultat: ElementResultat[] = [];

    for (const element of elements) {
      const credit = element.credit || 1;
      const { noteSession, noteRattrapage, noteRachat, noteFinale } = this.buildElementScores(element);

      accumulators.principale.points += noteSession * credit;
      accumulators.principale.credits += credit;

      accumulators.rattrapage.points += noteRattrapage * credit;
      accumulators.rattrapage.credits += credit;

      accumulators.best.points += noteFinale * credit;
      accumulators.best.credits += credit;

      elementsResultat.push({
        _id: element._id,
        designation: element.designation,
        credit,
        cc: this.round(element.cc ?? 0),
        examen: this.round(element.examen ?? 0),
        noteSession,
        rattrapage: noteRattrapage,
        rachat: noteRachat,
        noteFinale,
      });
    }

    const sessionSummaries = SESSION_TYPES.reduce(
      (acc, type) => {
        const { points, credits } = accumulators[type];
        const moyenne = credits > 0 ? points / credits : 0;
        acc[type] = {
          moyenne: this.round(moyenne),
          isValide: moyenne >= 10,
        };
        return acc;
      },
      {} as Record<SessionType, SessionStats>,
    );

    return {
      sessions: sessionSummaries,
      elements: elementsResultat,
    };
  }

  private static buildSessionAccumulator(): Record<SessionType, SessionAccumulator> {
    return SESSION_TYPES.reduce(
      (acc, type) => ({
        ...acc,
        [type]: {
          ncv: 0,
          ncnv: 0,
          totalObtenu: 0,
          totalMax: 0,
        },
      }),
      {} as Record<SessionType, SessionAccumulator>,
    );
  }

  private static buildSessionSummaries(
    accumulators: Record<SessionType, SessionAccumulator>,
  ): Record<SessionType, SessionSummary> {
    return SESSION_TYPES.reduce((acc, type) => {
      const { ncv, ncnv, totalObtenu, totalMax } = accumulators[type];
      const pourcentage = totalMax > 0 ? (totalObtenu / totalMax) * 100 : 0;
      const pourcentageArrondi = this.round(pourcentage);

      acc[type] = {
        ncv,
        ncnv,
        totalObtenu: this.round(totalObtenu),
        totalMax,
        pourcentage: pourcentageArrondi,
        mention: this.getMention(pourcentageArrondi),
      };

      return acc;
    }, {} as Record<SessionType, SessionSummary>);
  }

  private static buildSessionCredits(defaultValue = 0): SessionCreditMap {
    return SESSION_TYPES.reduce(
      (acc, type) => ({
        ...acc,
        [type]: defaultValue,
      }),
      {} as SessionCreditMap,
    );
  }

  private static applySemestreCreditTotals(
    summaries: Record<SessionType, SessionSummary>,
    semestreCredit: number,
  ): Record<SessionType, SessionSummary> {
    if (semestreCredit <= 0) {
      return summaries;
    }

    const semestreTotalMax = semestreCredit * 20;

    return SESSION_TYPES.reduce((acc, type) => {
      const summary = summaries[type];
      const totalObtenu = this.round((summary.pourcentage / 100) * semestreTotalMax);

      acc[type] = {
        ...summary,
        totalObtenu,
        totalMax: semestreTotalMax,
      };

      return acc;
    }, {} as Record<SessionType, SessionSummary>);
  }

  private static calculerResultatSemestre(
    semestre: SemestreNote,
  ): SemestreResultat {
    const unitesResultat: UniteResultat[] = [];
    const sessionAccumulator = this.buildSessionAccumulator();
    const validatedCredits = this.buildSessionCredits();
    const semestreCredit = semestre.credit || 0;

    for (const unite of semestre.unites) {
      const { sessions, elements } = this.calculerMoyenneUnite(unite);
      const credit = unite.credit || 0;
      const bestSession = sessions.best;

      SESSION_TYPES.forEach((type) => {
        const summary = sessions[type];
        const aggregator = sessionAccumulator[type];
        aggregator.totalObtenu += summary.moyenne * credit;
        aggregator.totalMax += 20 * credit;
        if (summary.isValide) {
          validatedCredits[type] += credit;
        }
      });

      unitesResultat.push({
        _id: unite._id,
        code: unite.code,
        designation: unite.designation,
        credit,
        moyenne: bestSession.moyenne,
        isValide: bestSession.isValide,
        sessions,
        elements,
      });
    }

    const sessions = this.applySemestreCreditTotals(
      this.buildSessionSummaries(sessionAccumulator),
      semestreCredit,
    );

    SESSION_TYPES.forEach((type) => {
      const session = sessions[type];
      const totalCredits = semestreCredit > 0 ? semestreCredit : session.ncv + session.ncnv;
      const ncv = this.round(validatedCredits[type]);
      const ncnv = this.round(Math.max(totalCredits - ncv, 0));

      sessions[type] = {
        ...session,
        ncv,
        ncnv,
      };
    });

    const bestSessionSummary = sessions.best;

    return {
      _id: semestre._id,
      designation: semestre.designation,
      credit: semestre.credit || 0,
      ncv: bestSessionSummary.ncv,
      ncnv: bestSessionSummary.ncnv,
      totalObtenu: bestSessionSummary.totalObtenu,
      totalMax: bestSessionSummary.totalMax,
      pourcentage: bestSessionSummary.pourcentage,
      mention: bestSessionSummary.mention,
      unites: unitesResultat,
      sessions,
    };
  }

  public static calculerResultatEtudiant(
    notesEtudiant: NotesEtudiant,
  ): ResultatEtudiant {
    const semestresResultat: SemestreResultat[] = [];
    const sessionAccumulator = this.buildSessionAccumulator();
    const promotionCredits = this.buildSessionCredits();

    for (const semestre of notesEtudiant.semestres) {
      const resultatSemestre = this.calculerResultatSemestre(semestre);
      semestresResultat.push(resultatSemestre);

      SESSION_TYPES.forEach((type) => {
        const summary = resultatSemestre.sessions[type];
        const aggregator = sessionAccumulator[type];
        aggregator.totalObtenu += summary.totalObtenu;
        aggregator.totalMax += summary.totalMax;
        aggregator.ncv += summary.ncv;
        promotionCredits[type] += resultatSemestre.credit || 0;
      });
    }

    const promotionSummaries = this.buildSessionSummaries(sessionAccumulator);

    SESSION_TYPES.forEach((type) => {
      const summary = promotionSummaries[type];
      const totalCredits = promotionCredits[type] > 0 ? promotionCredits[type] : summary.ncv + summary.ncnv;
      const ncv = this.round(summary.ncv);
      const ncnv = this.round(Math.max(totalCredits - ncv, 0));

      promotionSummaries[type] = {
        ...summary,
        ncv,
        ncnv,
      };
    });

    const bestSummary = promotionSummaries.best;

    return {
      studentId: notesEtudiant.studentId,
      studentName: notesEtudiant.studentName,
      matricule: notesEtudiant.matricule,
      semestres: semestresResultat,
      promotion: {
        totalObtenu: bestSummary.totalObtenu,
        totalMax: bestSummary.totalMax,
        pourcentage: bestSummary.pourcentage,
        mention: bestSummary.mention,
        ncv: bestSummary.ncv,
        ncnv: bestSummary.ncnv,
        sessions: promotionSummaries,
      },
    };
  }

  public static calculerResultatsPromotion(
    notesEtudiants: NotesEtudiant[],
  ): ResultatEtudiant[] {
    return notesEtudiants.map((notes) => this.calculerResultatEtudiant(notes));
  }

  public static classerParPourcentage(
    resultats: ResultatEtudiant[],
  ): ResultatEtudiant[] {
    return [...resultats].sort(
      (a, b) => b.promotion.pourcentage - a.promotion.pourcentage,
    );
  }

  public static getMoyennePromotion(pourcentage: number): number {
    return this.round((pourcentage / 100) * 20);
  }

  public static getPourcentageFromMoyenne(moyenne: number): number {
    return this.round((moyenne / 20) * 100);
  }

  public static getMentionFromMoyenne(moyenne: number): string {
    const pourcentage = this.getPourcentageFromMoyenne(moyenne);
    return this.getMention(pourcentage);
  }
}
