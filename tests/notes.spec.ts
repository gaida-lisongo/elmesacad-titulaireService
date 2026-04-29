import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Charger le .env explicitement pour les tests
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import server from '@src/server';
import { Notes } from '@src/models/Notes';

describe('Notes API Endpoints', () => {
  const testMatricule = 'TEST-MAT-2026';
  const testCourseRef = 'TEST-COURSE-001';

  const sampleNote = {
    studentId: 'STU-TEST-001',
    studentName: 'Test Student',
    matricule: testMatricule,
    email: 'test@student.com',
    semestre: {
      designation: 'Semestre 1',
      reference: 'SEM-REF-1',
      credit: 30
    },
    unite: {
      designation: 'Unité Test',
      reference: 'UE-REF-1',
      code: 'UE-TEST',
      credit: 6
    },
    matiere: {
      designation: 'Matière Test',
      reference: testCourseRef,
      credit: 4
    },
    cc: 15,
    examen: 12,
    rattrapage: 0,
    rachat: 0
  };

  beforeAll(async () => {
    // Utilisation de l'URI réelle pour un test en conditions réelles
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI non définie dans l\'environnement');
    }
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    // Nettoyage ciblé pour ne pas polluer la base réelle
    await Notes.deleteMany({ matricule: testMatricule });
  });

  afterAll(async () => {
    // Nettoyage après les tests
    await Notes.deleteMany({ matricule: testMatricule });
    // Optionnel: ne pas fermer si d'autres tests tournent, mais propre pour un test isolé
    // await mongoose.connection.close();
  });

  it('should add a new note (POST /api/notes/add)', async () => {
    const res = await request(server)
      .post('/api/notes/add')
      .send(sampleNote);

    expect(res.status).toBe(201);
    const body = res.body as { matricule: string; matiere: { reference: string } };
    expect(body.matricule).toBe(testMatricule);
    expect(body.matiere.reference).toBe(testCourseRef);
  });

  it('should get student notes in structured format (GET /api/notes/student/:matricule)', async () => {
    const res = await request(server)
      .get(`/api/notes/student/${testMatricule}`);

    expect(res.status).toBe(200);
    const body = res.body as { matricule: string; semestres: { unites: { elements: { _id: string }[] }[] }[] };
    expect(body.matricule).toBe(testMatricule);
    expect(body.semestres).toBeInstanceOf(Array);
    expect(body.semestres[0].unites[0].elements[0]._id).toBe(testCourseRef);
  });

  it('should get notes by course reference (GET /api/notes/course/:courseRef)', async () => {
    const res = await request(server)
      .get(`/api/notes/course/${testCourseRef}`);

    expect(res.status).toBe(200);
    const body = res.body as { matricule: string }[];
    expect(body).toBeInstanceOf(Array);
    expect(body[0].matricule).toBe(testMatricule);
  });

  it('should calculate student result (GET /api/notes/result/:matricule)', async () => {
    const res = await request(server)
      .get(`/api/notes/result/${testMatricule}`);

    expect(res.status).toBe(200);
    const body = res.body as { studentId: string; promotion: { totalObtenu: number } };
    expect(body.studentId).toBe(sampleNote.studentId);
    expect(body.promotion).toBeDefined();
    expect(body.promotion.totalObtenu).toBeGreaterThan(0);
  });

  it('Stress Test: should handle 50 concurrent requests', async () => {
    const requests = Array.from({ length: 50 }).map(() => 
      request(server).get(`/api/notes/student/${testMatricule}`)
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    console.log(`🚀 Stress Test: 50 requêtes traitées en ${endTime - startTime}ms`);
    
    responses.forEach(res => {
      expect(res.status).toBe(200);
      const body = res.body as { matricule: string };
      expect(body.matricule).toBe(testMatricule);
    });
  }, 30000); // Timeout augmenté pour le stress test

  it('should return 404 for non-existent student (GET /api/notes/student/UNKNOWN)', async () => {
    const res = await request(server)
      .get('/api/notes/student/UNKNOWN');

    expect(res.status).toBe(404);
  });

  it('should expose full CRUD by id, bulk POST, reject invalid ObjectId', async () => {
    const matriculeCrud = 'TEST-MAT-CRUD-ID';
    await Notes.deleteMany({ matricule: matriculeCrud });

    const cre = await request(server)
      .post('/api/notes/add')
      .send({
        ...sampleNote,
        matricule: matriculeCrud,
        matiere: { ...sampleNote.matiere, reference: 'TEST-CRUD-MAT-1' },
      });
    expect(cre.status).toBe(201);
    const noteId = (cre.body as { _id?: string })._id;
    expect(noteId).toBeTruthy();

    const getOne = await request(server).get(`/api/notes/${noteId}`);
    expect(getOne.status).toBe(200);
    expect((getOne.body as { matricule?: string }).matricule).toBe(matriculeCrud);

    const upd = await request(server)
      .put(`/api/notes/update/${noteId}`)
      .send({ cc: 16, examen: 11 });
    expect(upd.status).toBe(200);
    expect((upd.body as { cc: number }).cc).toBe(16);

    const badId = await request(server).get('/api/notes/not-an-object-id');
    expect(badId.status).toBe(400);

    const bulkRes = await request(server)
      .post('/api/notes/bulk')
      .send({
        notes: [
          {
            ...sampleNote,
            matricule: matriculeCrud,
            matiere: { ...sampleNote.matiere, reference: 'TEST-BULK-2' },
            cc: 10,
          },
          {
            ...sampleNote,
            matricule: matriculeCrud,
            matiere: { ...sampleNote.matiere, reference: 'TEST-BULK-3' },
            cc: 11,
          },
        ],
      });
    expect(bulkRes.status).toBe(201);
    expect((bulkRes.body as { count?: number }).count).toBe(2);

    const del = await request(server).delete(`/api/notes/delete/${noteId}`);
    expect(del.status).toBe(204);

    const gone = await request(server).get(`/api/notes/${noteId}`);
    expect(gone.status).toBe(404);

    await Notes.deleteMany({ matricule: matriculeCrud });
  });
});
