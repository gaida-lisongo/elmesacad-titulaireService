import { Request, Response } from 'express';
import { Seance } from '@src/models/Seance';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

export async function addSeance(req: Request, res: Response) {
  const seance = new Seance(req.body);
  await seance.save();
  return res.status(HttpStatusCodes.CREATED).json(seance);
}

export async function getAllSeances(_: Request, res: Response) {
  const seances = await Seance.find().populate('charge_horaire').lean();
  return res.status(HttpStatusCodes.OK).json(seances);
}

export async function getSeancesByCharge(req: Request, res: Response) {
  const { chargeId } = req.params;
  console.log("Charge ID: ", chargeId);
  const seances = await Seance.find({ charge_horaire: chargeId }).populate('charge_horaire').lean();
  console.log("Seances: ", seances);
  return res.status(HttpStatusCodes.OK).json(seances);
}

export async function updateSeance(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await Seance.findByIdAndUpdate(id, req.body as object, { new: true });
  if (!updated) return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Séance non trouvée' });
  return res.status(HttpStatusCodes.OK).json(updated);
}

export async function deleteSeance(req: Request, res: Response) {
  const { id } = req.params;
  await Seance.findByIdAndDelete(id);
  return res.status(HttpStatusCodes.NO_CONTENT).send();
}
