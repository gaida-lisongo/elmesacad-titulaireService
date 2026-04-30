import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Activite } from '@src/models/Activite';
import { ActiviteService } from '@src/services/activite.service';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

function parsePositiveInt(value: unknown, defaultValue: number): number {
  if (typeof value !== 'string') return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

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

export async function getAllActivites(req: Request, res: Response) {
  const page = parsePositiveInt(req.query.page, 1);
  const requestedLimit = parsePositiveInt(req.query.limit, 10);
  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;

  const [total, activites] = await Promise.all([
    Activite.countDocuments(),
    Activite.find()
      .populate('charge_horaire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit);
  return res.status(HttpStatusCodes.OK).json({
    items: activites.map((a) => ActiviteService.sanitizeForStudent(a)),
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}

export async function getActivitesByCharge(req: Request, res: Response) {
  const { chargeId } = req.params;
  const activites = await Activite.find({ charge_horaire: chargeId }).populate('charge_horaire').lean();
  return res.status(HttpStatusCodes.OK).json(activites.map((a) => ActiviteService.sanitizeForStudent(a)));
}

export async function getActiviteById(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant activité invalide' });
  }
  const activite = await Activite.findById(id).populate('charge_horaire').lean();
  if (!activite) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Activité non trouvée' });
  }
  return res.status(HttpStatusCodes.OK).json(ActiviteService.sanitizeForStudent(activite));
}

export async function deleteActivite(req: Request, res: Response) {
  const { id } = req.params;
  await Activite.findByIdAndDelete(id);
  return res.status(HttpStatusCodes.NO_CONTENT).send();
}
