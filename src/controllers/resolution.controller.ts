import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Resolution } from '@src/models/Resolution';
import { Activite } from '@src/models/Activite';
import { ResolutionService } from '@src/services/resolution.service';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

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
    resolution.note = ResolutionService.calculerNoteQCM(resolution, activite);
  }

  // 4. Sauvegarder
  await resolution.save();

  return res.status(HttpStatusCodes.CREATED).json(resolution);
}

export async function getAllResolutions(_: Request, res: Response) {
  const resolutions = await Resolution.find().populate('activite_id');
  return res.status(HttpStatusCodes.OK).json(resolutions);
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

  return res.status(HttpStatusCodes.OK).json(updated);
}
