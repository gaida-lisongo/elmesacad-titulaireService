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
