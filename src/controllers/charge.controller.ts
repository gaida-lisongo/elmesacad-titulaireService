import { Request, Response } from 'express';
import { ChargeHoraire } from '@src/models/ChargeHoraire';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

function firstQueryString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = Array.isArray(val) ? val[0] : val;
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t === '' ? undefined : t;
}

function buildChargeFilter(query: Request['query']): Record<string, string> {
  const filter: Record<string, string> = {};

  const promotionRef = firstQueryString(query.promotion_reference);
  if (promotionRef) filter['promotion.reference'] = promotionRef;

  const codeUnite = firstQueryString(query.code_unite);
  if (codeUnite) filter['unite.code_unite'] = codeUnite;

  const semestre = firstQueryString(query.semestre);
  if (semestre) filter['unite.semestre'] = semestre;

  const matiereRef = firstQueryString(query.matiere_reference);
  if (matiereRef) filter['matiere.reference'] = matiereRef;

  const titulaireMatricule = firstQueryString(query.titulaire_matricule);
  if (titulaireMatricule) filter['titulaire.matricule'] = titulaireMatricule;

  const titulaireEmail = firstQueryString(query.titulaire_email);
  if (titulaireEmail) filter['titulaire.email'] = titulaireEmail;

  const horaireJour = firstQueryString(query.horaire_jour);
  if (horaireJour) filter['horaire.jour'] = horaireJour;

  const horaireHeureDebut = firstQueryString(query.horaire_heure_debut);
  if (horaireHeureDebut) filter['horaire.heure_debut'] = horaireHeureDebut;

  const horaireHeureFin = firstQueryString(query.horaire_heure_fin);
  if (horaireHeureFin) filter['horaire.heure_fin'] = horaireHeureFin;

  return filter;
}

export async function addCharge(req: Request, res: Response) {
  const charge = new ChargeHoraire(req.body);
  await charge.save();
  return res.status(HttpStatusCodes.CREATED).json(charge);
}

export async function getAllCharges(req: Request, res: Response) {
  const filter = buildChargeFilter(req.query);
  const charges = await ChargeHoraire.find(filter);
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
