/**
 * SCRIPT DE TEST DU WORKFLOW DES NOTES
 * 
 * Ce script simule le workflow complet :
 * 1. Création d'une charge horaire
 * 2. Ajout de notes pour un étudiant
 * 3. Récupération des notes structurées (NotesEtudiant)
 * 4. Récupération des notes par cours
 * 5. Calcul des résultats finaux
 */

const BASE_URL = 'http://localhost:3001/api';

async function runTest() {
    console.log("🚀 Démarrage du test du workflow des notes...");

    try {
        // 1. Créer une Charge Horaire
        const chargeData = {
            matiere: { designation: "Algorithmique", reference: "MAT-001" },
            unite: { designation: "Informatique Fondamentale", code_unite: "UE-INF", semestre: "S1" },
            titulaire: { name: "Prof. Einstein", email: "einstein@univ.edu" }
        };
        const chargeRes = await fetch(`${BASE_URL}/charges/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chargeData)
        });
        const charge = await chargeRes.json();
        console.log("✅ Charge Horaire créée:", charge._id);

        // 2. Ajouter des Notes pour un étudiant
        const studentMatricule = "2026-INB-001";
        const noteData = {
            studentId: "STU-123",
            studentName: "Nathan",
            matricule: studentMatricule,
            email: "nathan@example.com",
            semestre: { designation: "Semestre 1", reference: "SEM-1", credit: 30 },
            unite: { designation: "Informatique Fondamentale", reference: "UE-INF", code: "UE-INF", credit: 6 },
            matiere: { designation: "Algorithmique", reference: "MAT-001", credit: 4 },
            cc: 14,
            examen: 12,
            rattrapage: 0,
            rachat: 0
        };

        const noteRes = await fetch(`${BASE_URL}/notes/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        console.log("✅ Note ajoutée pour le matricule:", studentMatricule);

        // 3. Récupération des notes structurées (NotesEtudiant)
        const notesEtudiantRes = await fetch(`${BASE_URL}/notes/student/${studentMatricule}`);
        const notesEtudiant = await notesEtudiantRes.json();
        console.log("✅ Structure NotesEtudiant récupérée pour l'étudiant");
        // console.log(JSON.stringify(notesEtudiant, null, 2));

        // 4. Récupération des notes par cours
        const courseRef = "MAT-001";
        const notesCourseRes = await fetch(`${BASE_URL}/notes/course/${courseRef}`);
        const notesCourse = await notesCourseRes.json();
        console.log(`✅ Structure NotesEtudiant récupérée pour le cours ${courseRef} (${notesCourse.length} étudiant(s))`);

        // 5. Calcul des résultats finaux
        const resultRes = await fetch(`${BASE_URL}/notes/result/${studentMatricule}`);
        const result = await resultRes.json();
        console.log("✅ Résultats calculés (Moyenne, Mention, etc.):");
        console.log(`   - Moyenne Promotion: ${result.promotion.pourcentage}%`);
        console.log(`   - Mention: ${result.promotion.mention}`);

    } catch (error) {
        console.error("❌ Erreur pendant le test:", error.message);
    }
}

runTest();
