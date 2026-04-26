import { Schema, model, Document, Types } from 'mongoose';

export interface IResolution extends Document {
  email: string;
  matricule: string;
  matiere: string;
  note: number;
  activite_id: Types.ObjectId;
  reponses_qcm: Array<{ qcm_id: string; reponse: string }>;
  reponses_tp: Array<{ tp_id: string; reponse: string; fichiers: string[] }>;
  status: boolean;
}

const ResolutionSchema = new Schema<IResolution>({
  email: String,
  matricule: String,
  matiere: String,
  note: { type: Number, default: 0 },
  activite_id: { type: Schema.Types.ObjectId, ref: 'Activite', required: true },
  reponses_qcm: [{
    qcm_id: String,
    reponse: String,
  }],
  reponses_tp: [{
    tp_id: String,
    reponse: String,
    fichiers: [String],
  }],
  status: { type: Boolean, default: false },
}, { timestamps: true });

export const Resolution = model<IResolution>('Resolution', ResolutionSchema);
