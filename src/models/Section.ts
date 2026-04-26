import { Schema } from 'mongoose';

export interface ISection {
  title: string;
  contenu: string[];
}

export const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  contenu: { type: [String], required: true },
}, { _id: false });
