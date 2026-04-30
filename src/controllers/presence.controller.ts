import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Presence } from '@src/models/Presence';
import { Seance } from '@src/models/Seance';
import { PresenceService } from '@src/services/presence.service';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

interface SeanceInput {
  heure_debut: string;
  date: string | number | Date;
  lecon: string;
}

/**
 * Point d'entrée pour le scan QR Code par l'étudiant
 */
export async function checkPresence(req: Request, res: Response) {
  const { matricule, email, seanceRef, latitude, longitude } = req.body as {
    matricule: string;
    email: string;
    seanceRef: string;
    latitude: number;
    longitude: number;
  };

  const seance = await Seance.findById(seanceRef) as unknown as SeanceInput | null;
  if (!seance) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ success: false, message: 'Séance non trouvée' });
  }

  // Vérifier si déjà présent
  const existing = await Presence.findOne({ matricule, seance: seanceRef });
  if (existing && existing.status !== 'absent') {
    return res.status(HttpStatusCodes.CONFLICT).json({ success: false, message: 'Présence déjà enregistrée' });
  }

  const evaluation = PresenceService.determinerStatut(seance, latitude, longitude);

  if (evaluation.status === 'absent') {
    return res.status(HttpStatusCodes.FORBIDDEN).json({ success: false, message: evaluation.message });
  }

  const presence = new Presence({
    matricule,
    email,
    matiere: seance.lecon,
    seance: seanceRef,
    localisation: { 
      type: 'Point', 
      coordinates: [longitude, latitude] // MongoDB attend [longitude, latitude]
    },
    status: evaluation.status,
    date: new Date()
  });

  await presence.save();

  return res.status(HttpStatusCodes.OK).json({
    success: true,
    message: evaluation.message,
    data: presence
  });
}

/**
 * Récupérer les présences d'une séance (pour l'enseignant)
 */
export async function getPresencesBySeance(req: Request, res: Response) {
  const { seanceId } = req.params;
  const presences = await Presence.find({ seance: seanceId }).lean();
  return res.status(HttpStatusCodes.OK).json(presences);
}

/**
 * Modification manuelle d'une présence par l'enseignant
 */
export async function updatePresence(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ success: false, error: 'Identifiant de présence invalide' });
  }

  const payload = req.body as { status?: unknown };
  const updateData: { status?: string } = {};

  if (typeof payload.status === 'string') {
    updateData.status = payload.status.trim().toLowerCase();
  }

  if (!updateData.status) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'Le champ "status" est requis pour la mise à jour',
    });
  }

  const updated = await Presence.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ success: false, error: 'Présence non trouvée' });
  }

  return res.status(HttpStatusCodes.OK).json({ success: true, data: updated });
}
