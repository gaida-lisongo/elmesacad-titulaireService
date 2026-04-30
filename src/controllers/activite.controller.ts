import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Activite } from '@src/models/Activite';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

export async function addActivite(req: Request, res: Response) {
  try {
    const activite = new Activite(req.body as object);
    await activite.save();
    return res.status(HttpStatusCodes.CREATED).json(activite);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: message });
  }
}

export async function getActivitesByCharge(req: Request, res: Response) {
  const { chargeId } = req.params;
  const activites = await Activite.find({ charge_horaire: chargeId }).lean();
  return res.status(HttpStatusCodes.OK).json(activites);
}

export async function getActiviteById(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant activité invalide' });
  }
  const activite = await Activite.findById(id).lean();
  if (!activite) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Activité non trouvée' });
  }
  return res.status(HttpStatusCodes.OK).json(activite);
}

export async function deleteActivite(req: Request, res: Response) {
  const { id } = req.params;
  await Activite.findByIdAndDelete(id);
  return res.status(HttpStatusCodes.NO_CONTENT).send();
}
