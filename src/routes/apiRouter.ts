import { Router } from 'express';

import Paths from '@src/common/constants/Paths';

import UserRoutes from './UserRoutes';
import * as ChargeController from '@src/controllers/charge.controller';
import * as SeanceController from '@src/controllers/seance.controller';
import * as NoteController from '@src/controllers/note.controller';
import * as ResolutionController from '@src/controllers/resolution.controller';
import * as PresenceController from '@src/controllers/presence.controller';
import * as ActiviteController from '@src/controllers/activite.controller';

/******************************************************************************
                                Setup
******************************************************************************/

const apiRouter = Router();

// Activités
const activiteRouter = Router();
activiteRouter.post(Paths.Activites.Add, ActiviteController.addActivite);
activiteRouter.get(Paths.Activites.GetById, ActiviteController.getActiviteById);
activiteRouter.get(Paths.Activites.ByCharge, ActiviteController.getActivitesByCharge);
activiteRouter.delete(Paths.Activites.Delete, ActiviteController.deleteActivite);
apiRouter.use(Paths.Activites._, activiteRouter);

// Charges
const chargeRouter = Router();
chargeRouter.post(Paths.Charges.Add, ChargeController.addCharge);
chargeRouter.get(Paths.Charges.All, ChargeController.getAllCharges);
chargeRouter.get(Paths.Charges.GetById, ChargeController.getChargeById);
chargeRouter.put(Paths.Charges.Update, ChargeController.updateCharge);
chargeRouter.delete(Paths.Charges.Delete, ChargeController.deleteCharge);
apiRouter.use(Paths.Charges._, chargeRouter);

// Seances
const seanceRouter = Router();
seanceRouter.post(Paths.Seances.Add, SeanceController.addSeance);
seanceRouter.get(Paths.Seances.All, SeanceController.getAllSeances);
seanceRouter.get(Paths.Seances.ByCharge, SeanceController.getSeancesByCharge);
seanceRouter.put(Paths.Seances.Update, SeanceController.updateSeance);
seanceRouter.delete(Paths.Seances.Delete, SeanceController.deleteSeance);
apiRouter.use(Paths.Seances._, seanceRouter);

// Presences
const presenceRouter = Router();
presenceRouter.post(Paths.Presences.Check, PresenceController.checkPresence);
presenceRouter.get(Paths.Presences.BySeance, PresenceController.getPresencesBySeance);
presenceRouter.put(Paths.Presences.Update, PresenceController.updatePresence);
presenceRouter.patch(Paths.Presences.Update, PresenceController.updatePresence);
apiRouter.use(Paths.Presences._, presenceRouter);

// Notes (chemins statiques et paramétrés sans `/:id` avant les routes littérales)
const noteRouter = Router();
noteRouter.post(Paths.Notes.Add, NoteController.addNote);
noteRouter.post(Paths.Notes.Bulk, NoteController.addNotesBulk);
noteRouter.get(Paths.Notes.All, NoteController.getAllNotes);
noteRouter.get(Paths.Notes.GetByMatricule, NoteController.getStudentNotes);
noteRouter.get(Paths.Notes.GetByCourse, NoteController.getNotesByCourse);
noteRouter.get(Paths.Notes.ResultByMatricule, NoteController.getStudentResult);
noteRouter.put(Paths.Notes.Update, NoteController.updateNote);
noteRouter.delete(Paths.Notes.Delete, NoteController.deleteNote);
noteRouter.get(Paths.Notes.GetById, NoteController.getNoteById);
apiRouter.use(Paths.Notes._, noteRouter);

// Resolutions
const resolutionRouter = Router();
resolutionRouter.post(Paths.Resolutions.Submit, ResolutionController.submitResolution);
resolutionRouter.get(Paths.Resolutions.All, ResolutionController.getAllResolutions);
resolutionRouter.put(Paths.Resolutions.UpdateNote, ResolutionController.updateResolutionNote);
resolutionRouter.patch(Paths.Resolutions.UpdateNote, ResolutionController.updateResolutionNote);
apiRouter.use(Paths.Resolutions._, resolutionRouter);

// ----------------------- Add UserRouter --------------------------------- //

const userRouter = Router();

userRouter.get(Paths.Users.Get, UserRoutes.getAll);
userRouter.post(Paths.Users.Add, UserRoutes.add);
userRouter.put(Paths.Users.Update, UserRoutes.update);
userRouter.delete(Paths.Users.Delete, UserRoutes.delete);

apiRouter.use(Paths.Users._, userRouter);

/******************************************************************************
                                Export
******************************************************************************/

export default apiRouter;
