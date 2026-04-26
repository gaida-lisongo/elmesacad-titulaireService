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
 * PERFORMANCE TEST SUITE: SEANCE & PRESENCE WORKFLOW
 * Phase 1: 50 Charges Horaires
 * Phase 2: 3 Seances per Charge (150 total)
 * Phase 3: 150 Students per Seance for 10 random Seances (1500 total)
 */
describe('Seance & Presence Workflow Load Test', () => {
  const MONGO_URI = process.env.MONGODB_URI;
  const CHARGE_IDS: string[] = [];
  const SEANCE_IDS: string[] = [];

  const metrics = {
    charges: { success: 0, fail: 0, duration: 0 },
    seances: { success: 0, fail: 0, duration: 0 },
    presences: { success: 0, fail: 0, duration: 0 },
  };

  beforeAll(async () => {
    if (!MONGO_URI) throw new Error('MONGODB_URI is not defined');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    console.log('🚀 Connected to REAL MongoDB Atlas for Seance/Presence Load Testing');
  }, 30000);

  // --- PHASE 1: CREATION DE 50 CHARGES HORAIRES ---
  it('PHASE 1: Creation of 50 Charges Horaires', async () => {
    const limit = pLimit(10);
    const startTime = Date.now();

    const tasks = Array.from({ length: 50 }).map((_, i) => {
      return limit(async () => {
        try {
          const res = await request(server)
            .post('/api/charges/add')
            .send({
              matiere: { designation: `Matiere Load ${i}`, reference: `MAT-LOAD-${i}` },
              unite: { designation: "UE Load", code_unite: "UE-L", semestre: "S1" },
              titulaire: { name: "Prof Load", email: `prof${i}@inbtp.edu` }
            });
          
          if (res.status === 201) {
            metrics.charges.success++;
            const body = res.body as { _id: string };
            CHARGE_IDS.push(body._id);
          } else {
            metrics.charges.fail++;
          }
        } catch (_e) {
          metrics.charges.fail++;
        }
      });
    });

    await Promise.all(tasks);
    metrics.charges.duration = Date.now() - startTime;
    console.log(`📊 PHASE 1: ${metrics.charges.success} Charges created in ${metrics.charges.duration}ms`);
    expect(metrics.charges.success).toBe(50);
  }, 60000);

  // --- PHASE 2: CREATION DE 3 SEANCES PAR CHARGE ---
  it('PHASE 2: Creation of 3 Seances per Charge (150 total)', async () => {
    const limit = pLimit(20);
    const startTime = Date.now();

    const tasks = CHARGE_IDS.flatMap((chargeId) => {
      return Array.from({ length: 3 }).map((_, j) => {
        return limit(async () => {
          try {
            const res = await request(server)
              .post('/api/seances/add')
              .send({
                charge_horaire: chargeId,
                lecon: `Leçon ${j+1}`,
                salle: `Salle ${j+1}`,
                date: new Date(),
                heure_debut: "08:00",
                heure_fin: "10:00"
              });
            
            if (res.status === 201) {
              metrics.seances.success++;
              const body = res.body as { _id: string };
              SEANCE_IDS.push(body._id);
            } else {
              metrics.seances.fail++;
            }
          } catch (_e) {
            metrics.seances.fail++;
          }
        });
      });
    });

    await Promise.all(tasks);
    metrics.seances.duration = Date.now() - startTime;
    console.log(`📊 PHASE 2: ${metrics.seances.success} Seances created in ${metrics.seances.duration}ms`);
    expect(metrics.seances.success).toBe(150);
  }, 90000);

  // --- PHASE 3: SOUSCRIPTION (PRESENCE) A 10 SEANCES ALEATOIRES ---
  it('PHASE 3: 150 Students per Seance for 10 random Seances (1500 total)', async () => {
    const limit = pLimit(50);
    const startTime = Date.now();
    
    // Sélectionner 10 séances aléatoires
    const selectedSeances = [...SEANCE_IDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);

    const tasks = selectedSeances.flatMap((seanceId) => {
      return Array.from({ length: 300 }).map((_, studentIdx) => {
        return limit(async () => {
          try {
            const res = await request(server)
              .post('/api/presences/check')
              .send({
                matricule: `STU-PERF-V2-${seanceId.substring(0,4)}-${studentIdx}`,
                email: `student${studentIdx}@inbtp.edu`,
                seanceRef: seanceId,
                latitude: parseFloat(process.env.INBTP_LAT || "-4.331105"),
                longitude: parseFloat(process.env.INBTP_LONG || "15.251937")
              });
            
            if (res.status === 200 || res.status === 201) {
              metrics.presences.success++;
            } else {
              metrics.presences.fail++;
            }
          } catch (e) {
            metrics.presences.fail++;
          }
        });
      });
    });

    await Promise.all(tasks);
    metrics.presences.duration = Date.now() - startTime;
    console.log(`📊 PHASE 3: ${metrics.presences.success} Presences checked in ${metrics.presences.duration}ms`);
    
    // Sauvegarde du rapport final
    const fs = require('fs') as { writeFileSync(p: string, c: string): void };
    fs.writeFileSync(
      path.resolve(__dirname, '../presence-load-test-v2-results.json'),
      JSON.stringify({ 
        timestamp: new Date().toISOString(),
        metrics 
      }, null, 2)
    );

    expect(metrics.presences.success).toBeGreaterThan(2800);
  }, 300000);
});
