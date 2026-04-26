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
    expect(res.body.matricule).toBe(testMatricule);
    expect(res.body.matiere.reference).toBe(testCourseRef);
  });

  it('should get student notes in structured format (GET /api/notes/student/:matricule)', async () => {
    const res = await request(server)
      .get(`/api/notes/student/${testMatricule}`);

    expect(res.status).toBe(200);
    expect(res.body.matricule).toBe(testMatricule);
    expect(res.body.semestres).toBeInstanceOf(Array);
    expect(res.body.semestres[0].unites[0].elements[0]._id).toBe(testCourseRef);
  });

  it('should get notes by course reference (GET /api/notes/course/:courseRef)', async () => {
    const res = await request(server)
      .get(`/api/notes/course/${testCourseRef}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0].matricule).toBe(testMatricule);
  });

  it('should calculate student result (GET /api/notes/result/:matricule)', async () => {
    const res = await request(server)
      .get(`/api/notes/result/${testMatricule}`);

    expect(res.status).toBe(200);
    expect(res.body.studentId).toBe(sampleNote.studentId);
    expect(res.body.promotion).toBeDefined();
    expect(res.body.promotion.totalObtenu).toBeGreaterThan(0);
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
      expect(res.body.matricule).toBe(testMatricule);
    });
  }, 30000); // Timeout augmenté pour le stress test

  it('should return 404 for non-existent student (GET /api/notes/student/UNKNOWN)', async () => {
    const res = await request(server)
      .get('/api/notes/student/UNKNOWN');

    expect(res.status).toBe(404);
  });
});
