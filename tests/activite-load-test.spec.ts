import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import pLimit from 'p-limit';
import server from '@src/server';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * PERFORMANCE TEST SUITE: ACTIVITE & RESOLUTION WORKFLOW
 * Phase 1: Creation of 50 Activities (30 QCM, 20 TP)
 * Phase 2: Mass Resolution Submission & Auto-grading
 */
describe('Activite & Resolution Workflow Load Test', () => {
  const MONGO_URI = process.env.MONGODB_URI;
  const ACTIVITE_IDS: { id: string, type: string, note_maximale: number }[] = [];
  let SAMPLE_CHARGE_ID = '';

  const metrics = {
    activites: { success: 0, fail: 0, duration: 0 },
    resolutions: { success: 0, fail: 0, duration: 0, totalScore: 0 },
  };

  beforeAll(async () => {
    if (!MONGO_URI) throw new Error('MONGODB_URI is not defined');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    
    // Créer une charge horaire parente pour les tests
    const chargeRes = await request(server)
      .post('/api/charges/add')
      .send({
        matiere: { designation: "Matiere Activite", reference: "MAT-ACT-101" },
        unite: { designation: "UE Activite", code_unite: "UE-ACT", semestre: "S1" },
        titulaire: { name: "Prof Activite", email: "prof.act@inbtp.edu" }
      });
    const chargeBody = chargeRes.body as { _id: string };
    SAMPLE_CHARGE_ID = chargeBody._id;
    
    console.log('🚀 Connected to REAL MongoDB Atlas for Activite Load Testing');
  }, 30000);

  // --- PHASE 1: CREATION DE 50 ACTIVITES (30 QCM, 20 TP) ---
  it('PHASE 1: Creation of 50 Activities (30 QCM, 20 TP)', async () => {
    const limit = pLimit(10);
    const startTime = Date.now();

    const tasks = Array.from({ length: 50 }).map((_, i) => {
      const isQCM = i < 30;
      const type = isQCM ? 'QCM' : 'TP';
      
      const payload = {
        charge_horaire: SAMPLE_CHARGE_ID,
        categorie: type,
        note_maximale: 20,
        date_remise: new Date(Date.now() + 86400000),
        status: "publié",
        qcm: isQCM ? [
          { enonce: "Question 1", options: ["A", "B", "C"], reponse: "A" },
          { enonce: "Question 2", options: ["A", "B", "C"], reponse: "B" }
        ] : undefined,
        tp: !isQCM ? [
          { enonce: "TP 1", description: [{ title: "Consigne", contenu: ["Faire ceci"] }], status: true }
        ] : undefined
      };

      return limit(async () => {
        try {
          const res = await request(server).post('/api/activites/add').send(payload);
          if (res.status === 201) {
            metrics.activites.success++;
            const body = res.body as { _id: string };
            ACTIVITE_IDS.push({ id: body._id, type: type, note_maximale: 20 });
          } else {
            metrics.activites.fail++;
          }
        } catch (_e) {
          metrics.activites.fail++;
        }
      });
    });

    await Promise.all(tasks);
    metrics.activites.duration = Date.now() - startTime;
    console.log(`📊 PHASE 1: ${metrics.activites.success} Activities created in ${metrics.activites.duration}ms`);
    expect(metrics.activites.success).toBe(50);
  }, 60000);

  // --- PHASE 2: SOUMISSION DE 1000 RESOLUTIONS (AUTO-GRADING) ---
  it('PHASE 2: Submission of 1000 Resolutions with Auto-grading', async () => {
    const limit = pLimit(50);
    const count = 1000;
    const startTime = Date.now();

    const tasks = Array.from({ length: count }).map((_, i) => {
      // Choisir une activité QCM au hasard pour tester l'auto-grading
      const qcmActivites = ACTIVITE_IDS.filter(a => a.type === 'QCM');
      const activite = qcmActivites[Math.floor(Math.random() * qcmActivites.length)];

      return limit(async () => {
        try {
          const res = await request(server)
            .post('/api/resolutions/submit')
            .send({
              matricule: `STU-ACT-${i}`,
              email: `student${i}@inbtp.edu`,
              matiere: "Algorithmique",
              activite_id: activite.id,
              reponses_qcm: [
                { qcm_id: "Question 1", reponse: Math.random() > 0.5 ? "A" : "B" }, // 50% de chance d'avoir juste
                { qcm_id: "Question 2", reponse: "B" } // Toujours juste
              ]
            });
          
          if (res.status === 201) {
            metrics.resolutions.success++;
            const body = res.body as { note: number };
            metrics.resolutions.totalScore += body.note;
          } else {
            metrics.resolutions.fail++;
          }
        } catch (_e) {
          metrics.resolutions.fail++;
        }
      });
    });

    await Promise.all(tasks);
    metrics.resolutions.duration = Date.now() - startTime;
    console.log(`📊 PHASE 2: ${metrics.resolutions.success} Resolutions submitted in ${metrics.resolutions.duration}ms`);
    console.log(`📈 Moyenne des notes calculées automatiquement: ${(metrics.resolutions.totalScore / metrics.resolutions.success).toFixed(2)}/20`);
    
    // Sauvegarde du rapport
    const fs = require('fs') as { writeFileSync(p: string, c: string): void };
    fs.writeFileSync(
      path.resolve(__dirname, '../activite-load-test-results.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), metrics }, null, 2)
    );

    expect(metrics.resolutions.success).toBeGreaterThan(950);
  }, 120000);
});
