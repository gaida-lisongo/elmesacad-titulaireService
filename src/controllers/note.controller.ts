import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notes, INotesLean } from '@src/models/Notes';
import { NoteManager, NotesEtudiant, SemestreNote } from '@src/services/note.manager';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

export async function addNote(req: Request, res: Response) {
  const note = new Notes(req.body as object);
  await note.save();
  return res.status(HttpStatusCodes.CREATED).json(note);
}

/** Body : tableau `[{ … }, …]` ou objet `{ "notes": [ … ] }` */
export async function addNotesBulk(req: Request, res: Response) {
  const raw = req.body as unknown;
  const items =
    Array.isArray(raw)
      ? (raw as object[])
      : raw && typeof raw === 'object' && Array.isArray((raw as { notes?: unknown }).notes)
        ? ((raw as { notes: object[] }).notes)
        : null;

  if (!items || items.length === 0) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'Corps attendu : un tableau JSON de lignes ou { "notes": [ … ] }',
    });
  }

  try {
    const notes = await Notes.insertMany(items, { ordered: false });
    return res.status(HttpStatusCodes.CREATED).json({ count: notes.length, notes });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la création en masse';
    return res.status(HttpStatusCodes.BAD_REQUEST).json({
      error: 'Échec partiel ou total de insertMany',
      details: message,
    });
  }
}

export async function getNoteById(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant de note invalide' });
  }
  const note = await Notes.findById(id).lean();
  if (!note) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Note non trouvée' });
  }
  return res.status(HttpStatusCodes.OK).json(note);
}

export async function updateNote(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant de note invalide' });
  }
  const updated = await Notes.findByIdAndUpdate(id, req.body as object, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Note non trouvée' });
  }
  return res.status(HttpStatusCodes.OK).json(updated);
}

export async function deleteNote(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json({ error: 'Identifiant de note invalide' });
  }
  const deleted = await Notes.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Note non trouvée' });
  }
  return res.status(HttpStatusCodes.NO_CONTENT).send();
}

export async function getStudentNotes(req: Request, res: Response) {
  const { matricule } = req.params;
  const notes = await Notes.find({ matricule }).lean() as unknown as INotesLean[];

  if (notes.length === 0) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Aucune note trouvée pour ce matricule' });
  }

  return res.status(HttpStatusCodes.OK).json(formatToNotesEtudiant(notes));
}

interface AggregateResult {
  studentId: string;
  studentName: string;
  matricule: string;
  semestres: INotesLean[];
}

export async function getNotesByCourse(req: Request, res: Response) {
  const { courseRef } = req.params;
  
  const results = await Notes.aggregate([
    { $match: { 'matiere.reference': courseRef } },
    {
      $group: {
        _id: "$matricule",
        studentId: { $first: "$studentId" },
        studentName: { $first: "$studentName" },
        semestre: { $first: "$semestre" },
        unite: { $first: "$unite" },
        notes: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        _id: 0,
        studentId: 1,
        studentName: 1,
        matricule: "$_id",
        semestres: "$notes"
      }
    }
  ]) as unknown as AggregateResult[];

  if (results.length === 0) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Aucune note trouvée pour ce cours' });
  }
  
  const finalResults = results.map(r => formatToNotesEtudiant(r.semestres));
  
  return res.status(HttpStatusCodes.OK).json(finalResults);
}

function formatToNotesEtudiant(notes: INotesLean[]): NotesEtudiant {
  const firstNote = notes[0];
  const notesEtudiant: NotesEtudiant = {
    studentId: firstNote.studentId,
    studentName: firstNote.studentName,
    matricule: firstNote.matricule,
    semestres: []
  };

  const semestresMap: Record<string, SemestreNote> = {};

  for (const n of notes) {
    let semestre = semestresMap[n.semestre.reference];
    if (!semestre) {
      semestre = {
        _id: n.semestre.reference,
        designation: n.semestre.designation,
        credit: n.semestre.credit,
        unites: []
      };
      semestresMap[n.semestre.reference] = semestre;
      notesEtudiant.semestres.push(semestre);
    }

    let unite = semestre.unites.find(u => u._id === n.unite.reference);
    if (!unite) {
      unite = {
        _id: n.unite.reference,
        code: n.unite.code,
        designation: n.unite.designation,
        credit: n.unite.credit,
        elements: []
      };
      semestre.unites.push(unite);
    }

    unite.elements.push({
      _id: n.matiere.reference,
      designation: n.matiere.designation,
      credit: n.matiere.credit,
      cc: n.cc,
      examen: n.examen,
      rattrapage: n.rattrapage,
      rachat: n.rachat
    });
  }

  return notesEtudiant;
}

export async function getStudentResult(req: Request, res: Response) {
  const { matricule } = req.params;
  const notes = await Notes.find({ matricule }).lean() as unknown as INotesLean[];

  if (notes.length === 0) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Aucune note trouvée' });
  }

  const notesEtudiant = formatToNotesEtudiant(notes);
  const resultat = NoteManager.calculerResultatEtudiant(notesEtudiant);
  return res.status(HttpStatusCodes.OK).json(resultat);
}

export async function getAllNotes(_: Request, res: Response) {
  const notes = await Notes.find().lean();
  return res.status(HttpStatusCodes.OK).json(notes);
}
