import { Schema, model, Document } from 'mongoose';

export interface INotes extends Document {
  email: string;
  matricule: string;
  studentId: string;
  studentName: string;
  matiere: {
    designation: string;
    reference: string; // Utilisé pour matcher avec _id de student-service
    credit: number;
  };
  unite: {
    designation: string;
    reference: string; // Utilisé pour matcher avec _id de student-service
    code: string;
    credit: number;
  };
  semestre: {
    designation: string;
    reference: string; // Utilisé pour matcher avec _id de student-service
    credit: number;
  };
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
}

const NotesSchema = new Schema<INotes>({
  email: { type: String, required: true },
  matricule: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  matiere: {
    designation: String,
    reference: { type: String, index: true }, // Index pour accélérer les recherches par cours
    credit: { type: Number, default: 0 },
  },
  unite: {
    designation: String,
    reference: { type: String, index: true }, // Index pour accélérer les recherches par unité
    code: String,
    credit: { type: Number, default: 0 },
  },
  semestre: {
    designation: String,
    reference: { type: String, index: true }, // Index pour accélérer les recherches par semestre
    credit: { type: Number, default: 0 },
  },
  cc: { type: Number, default: 0 },
  examen: { type: Number, default: 0 },
  rattrapage: { type: Number, default: 0 },
  rachat: { type: Number, default: 0 },
}, { timestamps: true });

export const Notes = model<INotes>('Notes', NotesSchema);
