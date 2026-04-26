import { Request, Response } from 'express';
import { Resolution } from '@src/models/Resolution';
import { Activite } from '@src/models/Activite';
import { ResolutionService } from '@src/services/resolution.service';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

export async function submitResolution(req: Request, res: Response) {
  const { email, matricule, matiere, activite_id, reponses_qcm, reponses_tp } = req.body as {
    email: string;
    matricule: string;
    matiere: string;
    activite_id: string;
    reponses_qcm: any[];
    reponses_tp: any[];
  };

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
