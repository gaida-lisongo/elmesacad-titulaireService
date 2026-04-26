import { Schema, model, Document, Types } from 'mongoose';
import { ISection, SectionSchema } from './Section';

export interface ISeance extends Document {
  charge_horaire: Types.ObjectId;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  date: Date;
  salle: string;
  lecon: string;
  description: ISection[];
  status: boolean;
}

const SeanceSchema = new Schema<ISeance>({
  charge_horaire: { type: Schema.Types.ObjectId, ref: 'ChargeHoraire', required: true },
  jour: String,
  heure_debut: String,
  heure_fin: String,
  date: Date,
  salle: String,
  lecon: String,
  description: [SectionSchema],
  status: { type: Boolean, default: false },
}, { timestamps: true });

export const Seance = model<ISeance>('Seance', SeanceSchema);
