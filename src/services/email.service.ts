import axios from 'axios';
import logger from 'jet-logger';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: unknown[];
}

export type NotifyGradeVariant = 'qcm_auto' | 'manual_qcm' | 'manual_tp';

/** Libellés issus de la charge horaire liée à l'activité (table ChargeHoraire). */
export interface ChargeMailBlock {
  matiereDesignation: string;
  matiereReference: string;
  promotionDesignation?: string;
  uniteDesignation?: string;
  uniteCode?: string;
  uniteSemestre?: string;
  titulaireName?: string;
}

export class EmailService {
  static async sendEmail(payload: EmailPayload): Promise<unknown> {
    const emailApiUrl = process.env.EMAIL_API_URL ?? '';
    if (!emailApiUrl) {
      logger.warn('EMAIL_API_URL non configurée. Email non envoyé.');
      return;
    }

    try {
      const response = await axios.post(emailApiUrl, payload);
      const toLabel = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;
      logger.info(`Email envoyé avec succès à : ${toLabel}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.err(`Erreur lors de l'envoi de l'email : ${message}`);
      throw error;
    }
  }

  static async notifyStudentGrade(params: {
    to: string;
    variant: NotifyGradeVariant;
    note: number;
    noteMaximale: number;
    categorie: 'QCM' | 'TP';
    charge: ChargeMailBlock | null;
    /** Si la charge n’a pas été trouvée (ex. anciennes données). */
    fallbackMatiereLabel?: string;
  }): Promise<unknown> {
    const {
      to,
      variant,
      note,
      noteMaximale,
      categorie,
      charge,
      fallbackMatiereLabel = '',
    } = params;

    const blocCharge = htmlChargeBloc(charge, fallbackMatiereLabel.trim());
    const copy = variantCopy(variant, charge, fallbackMatiereLabel);
    const noteStr = Number.isFinite(note) ? note.toFixed(2) : String(note);
    const maxStr = Number.isFinite(noteMaximale) ? String(noteMaximale) : '—';
    const encouragement = pedagogicalEncouragementHtml(note, noteMaximale);

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a5f7a 0%, #0d4a63 100%); color: white; padding: 22px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; opacity: 0.9; letter-spacing: 0.5px;">INBTP • Suivi pédagogique</p>
          <h1 style="margin: 0; font-size: 22px; font-weight: 600;">${copy.headerTitle}</h1>
        </div>
        <div style="padding: 28px 30px 32px 30px; color: #333; line-height: 1.65;">
          <p style="margin: 0 0 16px 0;">Bonjour,</p>
          ${blocCharge}
          <p style="margin: 18px 0;">${copy.intro}</p>
          <div style="background-color: #f4f9fb; padding: 22px 20px; border-radius: 10px; margin: 22px 0; text-align: center; border: 1px solid #cce3eb;">
            <p style="margin: 0 0 6px 0; font-size: 15px; color: #1a5f7a; font-weight: 600;">Votre note pour ${
              categorie === 'QCM' ? 'ce QCM' : 'ce travail pratique'
            }</p>
            <p style="margin: 0; font-size: 34px; font-weight: bold; color: #0d4a63; letter-spacing: -0.5px;">
              ${escapeHtml(noteStr)}<span style="font-size: 20px; color: #5a7a87; font-weight: 600;"> / ${escapeHtml(maxStr)}</span>
            </p>
          </div>
          ${encouragement}
          <p style="font-size: 14px; color: #666; margin-top: 24px; padding-top: 18px; border-top: 1px solid #eee;">
            Une question ou un doute sur l’évaluation ? Écrivez à votre titulaire ou au secrétariat de votre section : nous préférons toujours le dialogue avant le malentendu.
          </p>
          <p style="margin: 16px 0 0 0;">Cordialement,<br><strong>L’équipe pédagogique INBTP</strong></p>
        </div>
        <div style="background-color: #f4f4f4; color: #888; padding: 14px 16px; text-align: center; font-size: 12px;">
          &copy; ${new Date().getFullYear()} INBTP — Message automatique à conserver comme trace de vos résultats.
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: copy.subject,
      html,
    });
  }

  /** QCM auto-corrigé à la soumission */
  static async notifyQcmNote(params: {
    to: string;
    note: number;
    noteMaximale: number;
    charge: ChargeMailBlock | null;
    fallbackMatiere?: string;
  }): Promise<unknown> {
    return this.notifyStudentGrade({
      to: params.to,
      variant: 'qcm_auto',
      note: params.note,
      noteMaximale: params.noteMaximale,
      categorie: 'QCM',
      charge: params.charge,
      fallbackMatiereLabel: params.fallbackMatiere,
    });
  }
}

function variantCopy(
  variant: NotifyGradeVariant,
  charge: ChargeMailBlock | null,
  fallbackMatiere: string,
) {
  const labelPlain = coursePlainLabel(charge, fallbackMatiere);
  const labelSafe = escapeHtml(labelPlain);
  switch (variant) {
    case 'qcm_auto':
      return {
        subject: subjectPrefix('Résultat de QCM', charge, fallbackMatiere),
        headerTitle: 'Votre résultat de QCM',
        intro: `Merci pour votre engagement. Vos réponses au <strong>QCM</strong> pour <strong>${labelSafe}</strong> viennent d’être traitées <strong>automatiquement</strong>. Votre situation au sein de la <strong>charge horaire</strong> correspondante est mise à jour comme indiqué ci-dessous.`,
      };
    case 'manual_qcm':
      return {
        subject: subjectPrefix('Note QCM (publication)', charge, fallbackMatiere),
        headerTitle: 'Mise à jour de votre note — QCM',
        intro: `Votre titulaire a pris le temps de <strong>valider ou d’ajuster</strong> votre note pour le <strong>QCM</strong> prévu dans la charge horaire de <strong>${labelSafe}</strong>. Vous trouverez la note publiée sous ce message.`,
      };
    case 'manual_tp':
      return {
        subject: subjectPrefix('Note de TP publiée', charge, fallbackMatiere),
        headerTitle: 'Votre TP a été noté',
        intro: `Pour la charge horaire de <strong>${labelSafe}</strong>, votre <strong>travail pratique</strong> a été corrigé. Le résultat officiel est précisé ci-dessous.`,
      };
  }
}

function coursePlainLabel(charge: ChargeMailBlock | null, fallbackMatiere: string): string {
  const fb = fallbackMatiere.trim();
  const d = charge?.matiereDesignation?.trim() ?? '';
  const r = charge?.matiereReference?.trim() ?? '';
  if (!d && !r) {
    return fb || 'votre cours';
  }
  return formatRefMatiere(d, r);
}

function subjectPrefix(
  kind: string,
  charge: ChargeMailBlock | null,
  fallback: string,
): string {
  const labelPlain = coursePlainLabel(charge, fallback);
  const label = sanitizeSubjectFragment(labelPlain);
  return `${kind} — ${label} — INBTP`;
}

function formatRefMatiere(designation: string, reference: string): string {
  const d = designation.trim();
  const r = reference.trim();
  if (d && r) return `${d} (réf. ${r})`;
  return d || r || '';
}

function sanitizeSubjectFragment(s: string): string {
  return s.replace(/[\r\n]+/gu, ' ').trim().slice(0, 220);
}

function htmlChargeBloc(charge: ChargeMailBlock | null, fallbackMatiereLabel: string): string {
  if (!charge || (!charge.matiereDesignation.trim() && !charge.matiereReference.trim())) {
    const fb = fallbackMatiereLabel || 'la matière indiquée sur la plateforme';
    return `
      <div style="background: #fdfaf5; border-left: 4px solid #c68b2b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 14px; color: #4a3728;"><strong>Rappel du contexte :</strong>
        nous faisons état de votre activité dans le cours <strong>${escapeHtml(fb)}</strong>.
        Les informations détaillées de la charge horaire ne sont pas disponibles pour cet envoi.</p>
      </div>`;
  }

  const matRef = charge.matiereReference ? ` • référence cours <strong>${escapeHtml(charge.matiereReference)}</strong>` : '';
  const promo = charge.promotionDesignation
    ? ` • promotion <strong>${escapeHtml(charge.promotionDesignation)}</strong>`
    : '';
  const uniteParts = [
    charge.uniteCode ? escapeHtml(charge.uniteCode) : '',
    charge.uniteSemestre ? `semestre ${escapeHtml(charge.uniteSemestre)}` : '',
    charge.uniteDesignation ? escapeHtml(charge.uniteDesignation) : '',
  ].filter(Boolean);
  const unite = uniteParts.length ? ` • ${uniteParts.join(', ')}` : '';
  const tit =
    charge.titulaireName?.trim()
      ? `Titulaire de la charge horaire : <strong>${escapeHtml(charge.titulaireName)}</strong>.`
      : '';

  return `
    <div style="background: #f7fbfc; border: 1px solid #cce3eb; border-radius: 10px; padding: 18px 20px; margin-bottom: 6px;">
      <p style="margin: 0 0 10px 0; font-size: 15px; color: #0d4a63; font-weight: 600;">
        Charge horaire concernée
      </p>
      <p style="margin: 0; font-size: 14px; color: #333;">
        <strong>${escapeHtml(charge.matiereDesignation.trim() || fallbackMatiereLabel || 'Matière')}</strong>${matRef}${promo}${unite}
      </p>
      ${tit ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #444;">${tit}</p>` : ''}
    </div>`;
}

function pedagogicalEncouragementHtml(note: number, noteMaximale: number): string {
  const maxRaw = Number.isFinite(noteMaximale) ? noteMaximale : 0;
  const nRaw = Number.isFinite(note) ? note : NaN;

  let title = 'Continuons ensemble';
  let body =
    'Chaque contrôle permet de prendre vos repères. Conservez ce message comme trace de votre parcours, et n’hésitez pas à demander une explication lors du prochain cours.';
  let border = '#1a5f7a';
  let bg = '#f8fbfc';

  if (maxRaw > 0 && !Number.isNaN(nRaw)) {
    const n = Math.max(0, nRaw);
    const ratio = n / maxRaw;

    if (ratio >= 0.85) {
      title = 'Bravo pour ce très bon résultat !';
      body =
        'Vous montrez une solide maîtrise des notions évaluées. Profitez de cette réussite pour consolider ce qui fonctionne bien : régularité dans les révisions, lecture attentive des énoncés et confiance acquise.';
      border = '#1e8f4a';
      bg = '#f0faf3';
    } else if (ratio >= 0.65) {
      title = 'Très bien, vous êtes sur la bonne voie';
      body =
        'Vous avez un bon niveau sur une grande partie du contenu. En identifiant les quelques lacunes restantes avec votre titulaire, vous pouvez passer un cap très rapidement.';
      border = '#2a9db8';
      bg = '#f2fafc';
    } else if (ratio >= 0.45) {
      title = 'Un résultat correct — place à la progression';
      body =
        'Le plus important après une note intermédiaire, c’est de comprendre ce qui doit être revisité : revenez aux objectifs du cours, refaites un exercice type, puis demandez un retour précis lors de votre prochain TP ou séance.';
      border = '#c68b2b';
      bg = '#fefbf6';
    } else if (nRaw > 0) {
      title = 'C’est un coup dur, mais ce n’est qu’une étape';
      body =
        'Une note basse peut arriver à tout le monde. Ce qui compte après coup, ce sont les actions concrètes : prenez rendez-vous avec votre titulaire, précisez ce qui était flou dans le cours, et mettez en place un plan de révision ciblé. Nous préférons toujours l’élève qui rebondit à celui qui reste isolé.';
      border = '#b85c38';
      bg = '#fff8f6';
    } else {
      title = 'Nous vous tendons la main pour la suite';
      body =
        'Ce résultat ne définit pas votre potentiel : il signale que le travail doit être repositionné différemment. Contactez vite votre titulaire — un entretien bref permet souvent de transformer la situation avant le prochain contrôle.';
      border = '#7a5445';
      bg = '#faf6f5';
    }
  }

  return `
    <div style="margin: 22px 0 0 0; padding: 18px 20px; border-radius: 10px; background: ${bg}; border-left: 5px solid ${border};">
      <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #222;">${escapeHtml(title)}</p>
      <p style="margin: 0; font-size: 14px; color: #424242; line-height: 1.6;">${escapeHtml(body)}</p>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
