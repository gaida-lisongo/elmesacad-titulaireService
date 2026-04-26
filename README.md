# Titulaire Service - INBTP

Ce microservice gère la partie académique pour les enseignants (titulaires) de l'INBTP, incluant la gestion des charges horaires, des séances, des présences (avec validation géospatiale), des activités (QCM/TP) et des notes.

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (>= 16.0.0)
- MongoDB Atlas (ou une instance locale)

### Configuration
Créez un fichier `.env` à la racine avec les variables suivantes :
```env
PORT=3001
MONGODB_URI=votre_uri_mongodb
NODE_ENV=production

# Coordonnées INBTP pour la validation des présences
INBTP_LAT=-4.331105
INBTP_LONG=15.251937
LOCATION_TOLERANCE=30 # Tolérance en mètres
```

### Commandes
```bash
# Installer les dépendances
npm install

# Lancer en mode développement (avec auto-reload)
npm run dev

# Compiler pour la production
npm run build

# Lancer la version de production
npm run start
```

---

## 📚 Documentation API

Tous les endpoints sont préfixés par `/api`.

### 1. Gestion des Notes (`/api/notes`)

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/add` | Ajouter une note pour un étudiant |
| `GET` | `/student/:matricule` | Récupérer les notes structurées d'un étudiant |
| `GET` | `/course/:courseRef` | Récupérer les notes structurées par cours (Jury) |
| `GET` | `/result/:matricule` | Calculer le résultat final (Moyenne, Crédits) |

**Exemple de réponse `/student/:matricule` :**
```json
{
  "studentId": "ID-123",
  "studentName": "Nathan",
  "matricule": "2026-001",
  "semestres": [
    {
      "designation": "Semestre 1",
      "unites": [
        {
          "code": "UE-INF1",
          "elements": [
            { "_id": "MAT-001", "designation": "Algo", "cc": 15, "examen": 12 }
          ]
        }
      ]
    }
  ]
}
```

### 2. Séances et Présences (`/api/seances`, `/api/presences`)

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/seances/add` | Créer une nouvelle séance de cours |
| `GET` | `/seances/charge/:chargeId` | Lister les séances d'une charge horaire |
| `POST` | `/presences/check` | **Scan QR Code** (Étudiant) - Validation géo + retard |
| `GET` | `/presences/seance/:seanceId` | Liste des présences pour une séance (Enseignant) |

**Validation de présence (`POST /api/presences/check`) :**
- **Payload** : `{ matricule, email, seanceRef, latitude, longitude }`
- **Logique** : 
    - Vérifie si l'étudiant est dans un rayon de `LOCATION_TOLERANCE` mètres de l'INBTP.
    - Marque `late` si le scan a lieu plus de 15 min après le début.

### 3. Activités et Résolutions (`/api/activites`, `/api/resolutions`)

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/activites/add` | Créer un QCM ou un TP |
| `POST` | `/resolutions/submit` | Soumettre une réponse (Auto-grading pour QCM) |

---

## 🧪 Tests de Performance

Le service a été optimisé pour supporter de fortes charges (Peak Load) :
- **Notes** : 13 000 lectures concurrentes (p95 < 200ms).
- **Présences** : 3 000 scans simultanés gérés nativement par MongoDB (`2dsphere`).

Pour lancer les tests de charge :
```bash
npm run test
```

## 🛠️ Architecture Technique
- **Stack** : Node.js, Express, TypeScript, Mongoose.
- **Optimisations** : 
    - Agrégations MongoDB natives pour les structures de données complexes.
    - Indexation géospatiale pour les présences.
    - Utilisation de `.lean()` pour les lectures rapides.
