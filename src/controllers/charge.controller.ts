import { Request, Response } from 'express';
import { ChargeHoraire } from '@src/models/ChargeHoraire';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

export async function addCharge(req: Request, res: Response) {
  const charge = new ChargeHoraire(req.body);
  await charge.save();
  return res.status(HttpStatusCodes.CREATED).json(charge);
}

export async function getAllCharges(_: Request, res: Response) {
  const charges = await ChargeHoraire.find();
  return res.status(HttpStatusCodes.OK).json(charges);
}

export async function getChargeById(req: Request, res: Response) {
  const { id } = req.params;
  const charge = await ChargeHoraire.findById(id);
  if (!charge) return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Charge horaire non trouvée' });
  return res.status(HttpStatusCodes.OK).json(charge);
}

export async function updateCharge(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await ChargeHoraire.findByIdAndUpdate(id, req.body as object, { new: true, runValidators: true });
  if (!updated) return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Charge horaire non trouvée' });
  return res.status(HttpStatusCodes.OK).json(updated);
}

export async function deleteCharge(req: Request, res: Response) {
  const { id } = req.params;
  const deleted = await ChargeHoraire.findByIdAndDelete(id);
  if (!deleted) return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Charge horaire non trouvée' });
  return res.status(HttpStatusCodes.NO_CONTENT).send();
}
