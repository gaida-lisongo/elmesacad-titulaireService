import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Resolution } from '@src/models/Resolution';
import { Activite, type IActivite } from '@src/models/Activite';
import { ResolutionService } from '@src/services/resolution.service';
import { ActiviteService } from '@src/services/activite.service';
import { EmailService } from '@src/services/email.service';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

function escapeRegExpChars(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function isPopulatedActivite(a: unknown): a is Pick<IActivite, 'qcm'> & Record<string, unknown> {
  return (
    !!a &&
    typeof a === 'object' &&
    !Array.isArray(a) &&
    'categorie' in a &&
    ((a as { categorie?: string }).categorie === 'QCM' ||
      (a as { categorie?: string }).categorie === 'TP')
  );
}

export async function submitResolution(req: Request, res: Response) {
  const body = req.body as {
    email: string;
    matricule: string;
    matiere: string;
    activite_id: string;
    reponses_qcm: { qcm_id: string; reponse: string }[];
    reponses_tp: { tp_id: string; reponse: string; fichiers: string[] }[];
  };

  const { email, matricule, matiere, activite_id, reponses_qcm, reponses_tp } = body;

  if (!mongoose.isValidObjectId(activite_id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant activité invalide' });
  }

  // 1. Récupérer l'activité liée
  const activite = await Activite.findById(activite_id);
  if (!activite) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Activité non trouvée' });
  }

  // 2. Créer la résolution
  const resolution = new Resolution({
    email,
    matricule,
    matiere,
    activite_id,
    reponses_qcm,
    reponses_tp,
    status: true
  });

  // 3. Calculer la note si c'est un QCM
  if (activite.categorie === 'QCM') {
    resolution.note = ResolutionService.corrigerQcmAutomatiquement(resolution, activite);
  }

  // 4. Sauvegarder
  await resolution.save();

  if (activite.categorie === 'QCM' && typeof resolution.note === 'number') {
    const studentEmail = (email ?? '').trim();
    if (studentEmail) {
      try {
        await EmailService.notifyQcmNote(
          studentEmail,
          matiere,
          resolution.note,
          activite.note_maximale,
        );
      } catch {
        // Déjà journalisé dans EmailService — la soumission reste valide
      }
    }
  }

  return res.status(HttpStatusCodes.CREATED).json(resolution);
}

export async function getAllResolutions(_: Request, res: Response) {
  const resolutions = await Resolution.find().populate('activite_id');
  return res.status(HttpStatusCodes.OK).json(resolutions);
}

export async function getResolutionByActiviteAndEmail(req: Request, res: Response) {
  const { activiteId } = req.params;
  const email = normalizeEmail(req.query.email);

  if (!mongoose.isValidObjectId(activiteId)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant activité invalide' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: 'Paramètre query « email » requis et doit être une adresse valide' });
  }

  const resolutionDoc = await Resolution.findOne({
    activite_id: activiteId,
    email: { $regex: new RegExp(`^${escapeRegExpChars(email)}$`, 'i') },
  }).populate('activite_id');

  if (!resolutionDoc) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Résolution non trouvée pour cette activité et ce courriel' });
  }

  const payload = resolutionDoc.toObject();
  const act = payload.activite_id;
  if (isPopulatedActivite(act)) {
    (payload as { activite_id: unknown }).activite_id = ActiviteService.sanitizeForStudent(act);
  }

  return res.status(HttpStatusCodes.OK).json(payload);
}

export async function updateResolutionNote(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant de résolution invalide' });
  }

  const { note } = req.body as { note?: unknown };
  if (typeof note !== 'number' || Number.isNaN(note)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'La note est requise et doit être un nombre' });
  }

  const updated = await Resolution.findByIdAndUpdate(
    id,
    { note },
    { new: true, runValidators: true },
  ).populate('activite_id');

  if (!updated) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Résolution non trouvée' });
  }

  const activite = updated.activite_id as unknown as IActivite;
  const studentEmail = (updated.email ?? '').trim();
  if (
    studentEmail &&
    activite &&
    typeof activite === 'object' &&
    (activite.categorie === 'QCM' || activite.categorie === 'TP')
  ) {
    const variant =
      activite.categorie === 'QCM' ? ('manual_qcm' as const) : ('manual_tp' as const);
    try {
      await EmailService.notifyStudentGrade({
        to: studentEmail,
        matiere: updated.matiere ?? '',
        note,
        noteMaximale: activite.note_maximale,
        variant,
      });
    } catch {
      // Déjà journalisé dans EmailService — la mise à jour reste valide
    }
  }

  return res.status(HttpStatusCodes.OK).json(updated);
}
