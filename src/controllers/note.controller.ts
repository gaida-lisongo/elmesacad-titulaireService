import { Request, Response } from 'express';
import { Notes } from '@src/models/Notes';
import { NoteManager, NotesEtudiant, SemestreNote } from '@src/services/note.manager';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

interface NoteRaw {
  studentId: string;
  studentName: string;
  matricule: string;
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
  semestre: { reference: string; designation: string; credit: number };
  unite: { reference: string; code: string; designation: string; credit: number };
  matiere: { reference: string; designation: string; credit: number };
}

export async function addNote(req: Request, res: Response) {
  const note = new Notes(req.body as object);
  await note.save();
  return res.status(HttpStatusCodes.CREATED).json(note);
}

export async function getStudentNotes(req: Request, res: Response) {
  const { matricule } = req.params;
  const notes = await Notes.find({ matricule }).lean();

  if (notes.length === 0) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Aucune note trouvée pour ce matricule' });
  }

  return res.status(HttpStatusCodes.OK).json(formatToNotesEtudiant(notes as unknown as NoteRaw[]));
}

export async function getNotesByCourse(req: Request, res: Response) {
  const { courseRef } = req.params;
  
  const results = await Notes.aggregate([
    { $match: { 'matiere.reference': courseRef } },
    {
      $group: {
        _id: {
          matricule: "$matricule",
          semRef: "$semestre.reference",
          uniteRef: "$unite.reference"
        },
        studentId: { $first: "$studentId" },
        studentName: { $first: "$studentName" },
        semestre: { $first: "$semestre" },
        unite: { $first: "$unite" },
        elements: {
          $push: {
            _id: "$matiere.reference",
            designation: "$matiere.designation",
            credit: "$matiere.credit",
            cc: "$cc",
            examen: "$examen",
            rattrapage: "$rattrapage",
            rachat: "$rachat"
          }
        }
      }
    },
    {
      $group: {
        _id: {
          matricule: "$_id.matricule",
          semRef: "$_id.semRef"
        },
        studentId: { $first: "$studentId" },
        studentName: { $first: "$studentName" },
        semestre: { $first: "$semestre" },
        unites: {
          $push: {
            _id: "$unite.reference",
            code: "$unite.code",
            designation: "$unite.designation",
            credit: "$unite.credit",
            elements: "$elements"
          }
        }
      }
    },
    {
      $group: {
        _id: "$_id.matricule",
        studentId: { $first: "$studentId" },
        studentName: { $first: "$studentName" },
        matricule: { $first: "$_id.matricule" },
        semestres: {
          $push: {
            _id: "$semestre.reference",
            designation: "$semestre.designation",
            credit: "$semestre.credit",
            unites: "$unites"
          }
        }
      }
    },
    { $project: { _id: 0 } }
  ]);

  if (results.length === 0) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Aucune note trouvée pour ce cours' });
  }
  
  return res.status(HttpStatusCodes.OK).json(results);
}

function formatToNotesEtudiant(notes: NoteRaw[]): NotesEtudiant {
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
  const notes = await Notes.find({ matricule }).lean();

  if (notes.length === 0) {
    return res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Aucune note trouvée' });
  }

  const notesEtudiant = formatToNotesEtudiant(notes as unknown as NoteRaw[]);
  const resultat = NoteManager.calculerResultatEtudiant(notesEtudiant);
  return res.status(HttpStatusCodes.OK).json(resultat);
}

export async function getAllNotes(_: Request, res: Response) {
  const notes = await Notes.find().lean();
  return res.status(HttpStatusCodes.OK).json(notes);
}
