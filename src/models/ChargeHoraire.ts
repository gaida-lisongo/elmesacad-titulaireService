import { Schema, model, Document } from 'mongoose';
import { ISection, SectionSchema } from './Section';

export interface IChargeHoraire extends Document {
  matiere: { designation: string; reference: string };
  unite: { designation: string; code_unite: string; semestre: string };
  promotion: { designation: string; reference: string };
  titulaire: { name: string; matricule: string; email: string; telephone: string; disponibilite: string };
  horaire: { jour: string; heure_debut: string; heure_fin: string; date_debut: Date; date_fin: Date };
  status: boolean;
  descripteur: {
    objectif: ISection[];
    methodologie: ISection[];
    mode_evaluation: ISection[];
    penalties: ISection[];
    ressources: ISection[];
    plan_cours: ISection[];
  };
}

const ChargeHoraireSchema = new Schema<IChargeHoraire>({
  matiere: {
    designation: String,
    reference: String,
  },
  unite: {
    designation: String,
    code_unite: String,
    semestre: String,
  },
  promotion: {
    designation: String,
    reference: String,
  },
  titulaire: {
    name: String,
    matricule: String,
    email: String,
    telephone: String,
    disponibilite: String,
  },
  horaire: {
    jour: String,
    heure_debut: String,
    heure_fin: String,
    date_debut: Date,
    date_fin: Date,
  },
  status: { type: Boolean, default: true },
  descripteur: {
    objectif: [SectionSchema],
    methodologie: [SectionSchema],
    mode_evaluation: [SectionSchema],
    penalties: [SectionSchema],
    ressources: [SectionSchema],
    plan_cours: [SectionSchema],
  },
}, { timestamps: true });

export const ChargeHoraire = model<IChargeHoraire>('ChargeHoraire', ChargeHoraireSchema);
