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

### Charges horaires (`/api/charges`)

Une **charge horaire** décrit l’assignation d’un cours (matière, unité, promotion), le titulaire, le créneau (`horaire`), un **statut actif/inactif** (`status`), et éventuellement un **descripteur** (sections structurées : objectifs, méthodologie, etc.).

#### Structure JSON (modèle)

Les dates `date_debut` et `date_fin` dans `horaire` acceptent les chaînes ISO 8601 ; MongoDB les stocke comme `Date`.

| Champ | Type | Description |
| :--- | :--- | :--- |
| `matiere` | objet | `designation`, `reference` |
| `unite` | objet | `designation`, `code_unite`, `semestre` |
| `promotion` | objet | `designation`, `reference` |
| `titulaire` | objet | `name`, `matricule`, `email`, `telephone`, `disponibilite` |
| `horaire` | objet | `jour`, `heure_debut`, `heure_fin`, `date_debut`, `date_fin` |
| `status` | booléen | Par défaut `true` à la création ; `false` pour désactiver sans supprimer |
| `descripteur` | objet | Clés : `objectif`, `methodologie`, `mode_evaluation`, `penalties`, `ressources`, `plan_cours` — chaque valeur est un **tableau de sections** `{ "title": string, "contenu": string[] }` |

#### CRUD

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/charges/add` | Créer une charge horaire |
| `GET` | `/charges/all` | Lister les charges (optionnel : filtres en **query string**, voir ci‑dessous) |
| `GET` | `/charges/:id` | Récupérer une charge par son `_id` MongoDB |
| `PUT` | `/charges/update/:id` | Mettre à jour une charge (payload partiel possible) |
| `DELETE` | `/charges/delete/:id` | Supprimer une charge |

#### Filtres sur la liste (`GET /api/charges/all`)

Sans paramètres, la réponse est **toutes** les charges. Chaque paramètre suivant est **optionnel** ; ils se **combinent** avec une conjonction (« ET »).

| Paramètre | Champ MongoDB filtré | Exemple |
| :--- | :--- | :--- |
| `promotion_reference` | `promotion.reference` | `?promotion_reference=PROMO-2026-L1` |
| `code_unite` | `unite.code_unite` | `?code_unite=UE-INF` |
| `semestre` | `unite.semestre` | `?semestre=S1` (souvent avec `code_unite`) |
| `matiere_reference` | `matiere.reference` | `?matiere_reference=MAT-001` |
| `titulaire_matricule` | `titulaire.matricule` | `?titulaire_matricule=T-1001` |
| `titulaire_email` | `titulaire.email` | `?titulaire_email=dupont@inbtp.edu` |
| `horaire_jour` | `horaire.jour` | `?horaire_jour=Mercredi` |
| `horaire_heure_debut` | `horaire.heure_debut` | `?horaire_heure_debut=08:00` |
| `horaire_heure_fin` | `horaire.heure_fin` | `?horaire_heure_fin=10:00` |

Exemple combiné : charges de la promotion `PROMO-2026-L1` pour l’unité `UE-INF` au **Mercredi** 08:00–10:00 pour le titulaire `T-1001` :

`/api/charges/all?promotion_reference=PROMO-2026-L1&code_unite=UE-INF&titulaire_matricule=T-1001&horaire_jour=Mercredi&horaire_heure_debut=08:00&horaire_heure_fin=10:00`

#### Payload — création (`POST /api/charges/add`)

Exemple **minimal** (les champs non fournis restent vides ou absent selon la validation Mongoose ; `status` est alors `true` par défaut) :

```json
{
  "matiere": { "designation": "Algorithmique", "reference": "MAT-001" },
  "unite": { "designation": "Informatique Fondamentale", "code_unite": "UE-INF", "semestre": "S1" },
  "promotion": { "designation": "L1 INFO", "reference": "PROMO-2026-L1" },
  "titulaire": {
    "name": "Prof. Dupont",
    "matricule": "T-1001",
    "email": "dupont@inbtp.edu",
    "telephone": "+243900000000",
    "disponibilite": "lun-mer 08h-12h"
  },
  "horaire": {
    "jour": "Mercredi",
    "heure_debut": "08:00",
    "heure_fin": "10:00",
    "date_debut": "2026-01-15T00:00:00.000Z",
    "date_fin": "2026-06-30T00:00:00.000Z"
  },
  "status": true,
  "descripteur": {
    "objectif": [{ "title": "Objectifs généraux", "contenu": ["Notion X", "Notion Y"] }],
    "methodologie": [],
    "mode_evaluation": [],
    "penalties": [],
    "ressources": [],
    "plan_cours": []
  }
}
```

#### Payload — lecture (`GET /api/charges/:id`)

Aucun corps ; l’identifiant est dans l’URL (`:id` = `_id` MongoDB de la charge).

#### Payload — mise à jour (`PUT /api/charges/update/:id`)

Corps JSON **partiel** ou complet ; seuls les champs envoyés sont mis à jour.

```json
{
  "status": false,
  "titulaire": {
    "name": "Prof. Martin",
    "matricule": "T-1002",
    "email": "martin@inbtp.edu",
    "telephone": "+243900000001",
    "disponibilite": "mar-jeu"
  }
}
```

#### Payload — suppression (`DELETE /api/charges/delete/:id`)

Aucun corps ; réponse `204 No Content` si succès, `404` si l’id n’existe pas.

---

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
