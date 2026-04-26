import { Schema, model, Document, Types } from 'mongoose';
import { ISection, SectionSchema } from './Section';

export interface IRecours extends Document {
  note_id: Types.ObjectId;
  email: string;
  matricule: string;
  objet: string;
  description: ISection[];
  preuve: string[];
  status: boolean;
}

const RecoursSchema = new Schema<IRecours>({
  note_id: { type: Schema.Types.ObjectId, ref: 'Notes', required: true },
  email: String,
  matricule: String,
  objet: String,
  description: [SectionSchema],
  preuve: [String],
  status: { type: Boolean, default: false },
}, { timestamps: true });

export const Recours = model<IRecours>('Recours', RecoursSchema);
