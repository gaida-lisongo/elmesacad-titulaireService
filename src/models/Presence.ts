import { Schema, model, Document, Types } from 'mongoose';

export interface IPresence extends Document {
  email: string;
  matricule: string;
  matiere: string;
  localisation: { 
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  seance: Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'early' | 'excused';
}

const PresenceSchema = new Schema<IPresence>({
  email: String,
  matricule: { type: String, index: true },
  matiere: String,
  localisation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  seance: { type: Schema.Types.ObjectId, ref: 'Seance', required: true, index: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'early', 'excused'],
    default: 'absent',
  },
}, { timestamps: true });

// Index géospatial pour les calculs de distance natifs
PresenceSchema.index({ localisation: '2dsphere' });

export const Presence = model<IPresence>('Presence', PresenceSchema);
