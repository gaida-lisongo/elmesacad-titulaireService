import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Seance } from '@src/models/Seance';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function firstQueryValue(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function buildSeanceFilter(query: Request['query']): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const status = firstQueryValue(query.status);
  if (status === 'true' || status === 'false') {
    filter.status = status === 'true';
  }

  const chargeHoraire = firstQueryValue(query.charge_horaire);
  if (chargeHoraire && mongoose.isValidObjectId(chargeHoraire)) {
    filter.charge_horaire = chargeHoraire;
  }

  const jour = firstQueryValue(query.jour);
  if (jour) {
    filter.jour = { $regex: jour, $options: 'i' };
  }

  const salle = firstQueryValue(query.salle);
  if (salle) {
    filter.salle = { $regex: salle, $options: 'i' };
  }

  const lecon = firstQueryValue(query.lecon);
  if (lecon) {
    filter.lecon = { $regex: lecon, $options: 'i' };
  }

  const heureDebut = firstQueryValue(query.heure_debut);
  if (heureDebut) {
    filter.heure_debut = heureDebut;
  }

  const heureFin = firstQueryValue(query.heure_fin);
  if (heureFin) {
    filter.heure_fin = heureFin;
  }

  const dateFrom = firstQueryValue(query.date_from);
  const dateTo = firstQueryValue(query.date_to);
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) {
        dateFilter.$gte = from;
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!Number.isNaN(to.getTime())) {
        dateFilter.$lte = to;
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.date = dateFilter;
    }
  }

  return filter;
}

export async function addSeance(req: Request, res: Response) {
  const seance = new Seance(req.body);
  await seance.save();
  return res.status(HttpStatusCodes.CREATED).json(seance);
}

export async function getAllSeances(req: Request, res: Response) {
  const page = parsePositiveInt(req.query.page, 1);
  const requestedLimit = parsePositiveInt(req.query.limit, 10);
  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;
  const filter = buildSeanceFilter(req.query);

  const [total, seances] = await Promise.all([
    Seance.countDocuments(filter),
    Seance.find(filter)
      .populate('charge_horaire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return res.status(HttpStatusCodes.OK).json({
    data: seances,
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
