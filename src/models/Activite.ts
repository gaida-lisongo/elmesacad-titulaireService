import { Schema, model, Document, Types } from 'mongoose';
import { ISection, SectionSchema } from './Section';

export interface IActivite extends Document {
  date_remise: Date;
  status: string;
  note_maximale: number;
  montant: number;
  currency: string;
  categorie: 'TP' | 'QCM';
  charge_horaire: Types.ObjectId;
  qcm: Array<{ enonce: string; options: string[]; reponse: string }>;
  tp: Array<{ enonce: string; description: ISection[]; fichiers: string[]; status: boolean }>;
}

const ActiviteSchema = new Schema<IActivite>({
  date_remise: Date,
  status: String,
  note_maximale: { type: Number, required: true },
  montant: Number,
  currency: String,
  categorie: { type: String, enum: ['TP', 'QCM'], required: true },
  charge_horaire: { type: Schema.Types.ObjectId, ref: 'ChargeHoraire', required: true },
  qcm: [{
    enonce: String,
    options: [String],
    reponse: String,
  }],
  tp: [{
    enonce: String,
    description: [SectionSchema],
    fichiers: [String],
    status: Boolean,
  }],
}, { timestamps: true });

export const Activite = model<IActivite>('Activite', ActiviteSchema);
