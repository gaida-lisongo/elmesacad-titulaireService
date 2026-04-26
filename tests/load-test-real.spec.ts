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
 * PERFORMANCE TEST SUITE: INBTP PEAK LOAD SIMULATION
 * Target: 500 POSTs, 13,000 Student GETs, 500 Jury GETs
 */
describe('INBTP Peak Load Performance Test', () => {
  const MONGO_URI = process.env.MONGODB_URI;
  const MATRICULES_POOL: string[] = [];
  const COURSE_REFS_POOL = ['MAT-001', 'MAT-002', 'MAT-003', 'MAT-004', 'MAT-005'];

  // Metrics storage
  const metrics = {
    writing: { success: 0, fail: 0, latencies: [] as number[], duration: 0 },
    studentRead: { success: 0, fail: 0, latencies: [] as number[], duration: 0 },
    juryRead: { success: 0, fail: 0, latencies: [] as number[], duration: 0 },
  };

  beforeAll(async () => {
    if (!MONGO_URI) throw new Error('MONGODB_URI is not defined');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    console.log('🚀 Connected to REAL MongoDB Atlas for Load Testing');
  }, 30000);

  const calculateP95 = (latencies: number[]) => {
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  };

  const logMetrics = (phase: string, phaseMetrics: typeof metrics.writing) => {
    const rps = (phaseMetrics.success + phaseMetrics.fail) / (phaseMetrics.duration / 1000);
    console.log(`\n📊 PHASE: ${phase.toUpperCase()}`);
    console.log(`⏱️  Total Duration: ${phaseMetrics.duration.toFixed(2)}ms`);
    console.log(`📈 RPS: ${rps.toFixed(2)} req/s`);
    console.log(`✅ Success: ${phaseMetrics.success}`);
    console.log(`❌ Failures: ${phaseMetrics.fail}`);
    console.log(`🕒 p95 Latency: ${calculateP95(phaseMetrics.latencies).toFixed(2)}ms`);
  };

  // --- PHASE 1: WRITING (500 POSTs) ---
  it('PHASE 1: Writing - 500 Concurrent POSTs', async () => {
    const limit = pLimit(50); // 50 concurrent requests max locally
    const count = 500;
    const startTime = Date.now();

    const tasks = Array.from({ length: count }).map((_, i) => {
      const matricule = `LOAD-TEST-${Date.now()}-${i}`;
      MATRICULES_POOL.push(matricule);

      return limit(async () => {
        const startReq = Date.now();
        try {
          const res = await request(server)
            .post('/api/notes/add')
            .send({
              studentId: `STU-${i}`,
              studentName: `Student ${i}`,
              matricule: matricule,
              email: `student${i}@inbtp.edu`,
              semestre: { designation: "S1", reference: "SEM-1", credit: 30 },
              unite: { designation: "UE-INF", reference: "UE-1", code: "INF1", credit: 6 },
              matiere: { designation: "Algorithmique", reference: COURSE_REFS_POOL[i % 5], credit: 4 },
              cc: Math.floor(Math.random() * 20),
              examen: Math.floor(Math.random() * 20)
            });
          
          metrics.writing.latencies.push(Date.now() - startReq);
          if (res.status === 201) {
            metrics.writing.success++;
            const body = res.body as { matricule: string };
            MATRICULES_POOL.push(body.matricule);
          } else {
            metrics.writing.fail++;
          }
        } catch (_e) {
          metrics.writing.fail++;
        }
      });
    });

    await Promise.all(tasks);
    metrics.writing.duration = Date.now() - startTime;
    logMetrics('Writing', metrics.writing);
    expect(metrics.writing.success).toBeGreaterThan(0);
  }, 120000);

  // --- PHASE 2: STUDENTS READ (13,000 GETs) ---
  it('PHASE 2: Student Read - 13,000 GETs', async () => {
    const limit = pLimit(100); // Higher concurrency for reads
    const count = 13000;
    const startTime = Date.now();

    const tasks = Array.from({ length: count }).map((_, i) => {
      const matricule = MATRICULES_POOL[i % MATRICULES_POOL.length];
      return limit(async () => {
        const startReq = Date.now();
        try {
          const res = await request(server).get(`/api/notes/student/${matricule}`);
          metrics.studentRead.latencies.push(Date.now() - startReq);
          if (res.status === 200) metrics.studentRead.success++;
          else metrics.studentRead.fail++;
        } catch (_e) {
          metrics.studentRead.fail++;
        }
      });
    });

    await Promise.all(tasks);
    metrics.studentRead.duration = Date.now() - startTime;
    logMetrics('Student Read', metrics.studentRead);
    expect(metrics.studentRead.success).toBeGreaterThan(0);
  }, 300000); // 5 minutes for 13k reads

  // --- PHASE 3: JURY READ (500 GETs) ---
  it('PHASE 3: Jury Read - 500 GETs', async () => {
    const limit = pLimit(50); // Concurrence augmentée car le serveur est plus rapide
    const count = 500; // Passage à 500 requêtes
    const startTime = Date.now();
    const samples: any[] = [];

    const tasks = Array.from({ length: count }).map((_, i) => {
      const courseRef = COURSE_REFS_POOL[i % COURSE_REFS_POOL.length];
      return limit(async () => {
        const startReq = Date.now();
        try {
          const res = await request(server).get(`/api/notes/course/${courseRef}`);
          metrics.juryRead.latencies.push(Date.now() - startReq);
          if (res.status === 200) {
            metrics.juryRead.success++;
            if (samples.length < 5) samples.push(res.body);
          } else {
            metrics.juryRead.fail++;
          }
        } catch (_e) {
          metrics.juryRead.fail++;
        }
      });
    });

    await Promise.all(tasks);
    metrics.juryRead.duration = Date.now() - startTime;
    
    // Sauvegarde des échantillons
    const fs = require('fs') as { writeFileSync(p: string, c: string): void };
    fs.writeFileSync(
      path.resolve(__dirname, '../load-test-results.json'),
      JSON.stringify({ 
        timestamp: new Date().toISOString(),
        metrics, 
        samples 
      }, null, 2)
    );

    logMetrics('Jury Read', metrics.juryRead);
    console.log(`\n💾 Résultats (500 Jury GETs) enregistrés dans load-test-results.json`);
    expect(metrics.juryRead.success).toBeGreaterThan(0);
  }, 300000); // Timeout augmenté à 5 minutes pour 500 agrégations complexes
});
