import axios from 'axios';
import logger from 'jet-logger';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: unknown[];
}

export type NotifyGradeVariant = 'qcm_auto' | 'manual_qcm' | 'manual_tp';

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
    matiere: string;
    note: number;
    noteMaximale: number;
    variant: NotifyGradeVariant;
  }): Promise<unknown> {
    const { to, matiere, note, noteMaximale, variant } = params;
    const copy = variantCopy(variant, matiere);
    const noteStr = Number.isFinite(note) ? note.toFixed(2) : String(note);
    const maxStr = Number.isFinite(noteMaximale) ? String(noteMaximale) : '—';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1a5f7a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${copy.headerTitle}</h1>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
          <p>Bonjour,</p>
          <p>${copy.intro}</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center; border-left: 4px solid #1a5f7a;">
            <p style="margin: 0; font-size: 16px;">Note obtenue</p>
            <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #1a5f7a;">${escapeHtml(noteStr)} / ${escapeHtml(maxStr)}</p>
          </div>
          <p style="font-size: 14px; color: #666;">Pour toute réclamation ou question, contactez votre titulaire de cours ou le secrétariat.</p>
          <p>Cordialement,<br>L'équipe pédagogique INBTP</p>
        </div>
        <div style="background-color: #f4f4f4; color: #888; padding: 15px; text-align: center; font-size: 12px;">
          &copy; ${new Date().getFullYear()} INBTP — Tous droits réservés.
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
  static async notifyQcmNote(studentEmail: string, matiere: string, note: number, noteMaximale: number) {
    return this.notifyStudentGrade({
      to: studentEmail,
      matiere,
      note,
      noteMaximale,
      variant: 'qcm_auto',
    });
  }
}

function variantCopy(variant: NotifyGradeVariant, matiere: string) {
  const m = escapeHtml(matiere);
  switch (variant) {
    case 'qcm_auto':
      return {
        subject: `Résultat de votre QCM — ${matiere} — INBTP`,
        headerTitle: 'INBTP — Résultat QCM',
        intro: `Votre QCM pour la matière <strong>${m}</strong> a été corrigé automatiquement.`,
      };
    case 'manual_qcm':
      return {
        subject: `Mise à jour de votre note (QCM) — ${matiere} — INBTP`,
        headerTitle: 'INBTP — Note QCM',
        intro: `Votre QCM pour la matière <strong>${m}</strong> a été corrigé. Voici votre note.`,
      };
    case 'manual_tp':
      return {
        subject: `Note de votre TP — ${matiere} — INBTP`,
        headerTitle: 'INBTP — Résultat TP',
        intro: `Votre travail pratique pour la matière <strong>${m}</strong> a été corrigé. Voici votre note.`,
      };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
