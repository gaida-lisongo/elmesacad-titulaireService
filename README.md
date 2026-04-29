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

Une **charge horaire** décrit l’assignation d’un cours (matière, unité, promotion), le titulaire, le créneau (`horaire`), un **statut d’avancement** (`status`) pour le suivi des enseignements côté frontend, et éventuellement un **descripteur** (sections structurées : objectifs, méthodologie, etc.).

#### Structure JSON (modèle)

Les dates `date_debut` et `date_fin` dans `horaire` acceptent les chaînes ISO 8601 ; MongoDB les stocke comme `Date`.

| Champ | Type | Description |
| :--- | :--- | :--- |
| `matiere` | objet | `designation`, `reference` |
| `unite` | objet | `designation`, `code_unite`, `semestre` |
| `promotion` | objet | `designation`, `reference` |
| `titulaire` | objet | `name`, `matricule`, `email`, `telephone`, `disponibilite` |
| `horaire` | objet | `jour`, `heure_debut`, `heure_fin`, `date_debut`, `date_fin` |
| `status` | chaîne enum | `pending` : enseignement pas encore terminé ; `finish` : terminé ; `no` : non concerné / hors périmètre (ex. annulé). Défaut : `pending` |
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
| `status` | `status` | `?status=pending` ou `finish` ou `no` |

Exemple combiné : charges de la promotion `PROMO-2026-L1` pour l’unité `UE-INF` au **Mercredi** 08:00–10:00 pour le titulaire `T-1001` :

`/api/charges/all?promotion_reference=PROMO-2026-L1&code_unite=UE-INF&titulaire_matricule=T-1001&horaire_jour=Mercredi&horaire_heure_debut=08:00&horaire_heure_fin=10:00`

#### Payload — création (`POST /api/charges/add`)

Exemple **minimal** (les champs non fournis restent vides ou absent selon la validation Mongoose ; `status` est alors `pending` par défaut) :

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
  "status": "pending",
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
  "status": "finish",
  "titulaire": {
    "name": "Prof. Martin",
    "matricule": "T-1002",
    "email": "martin@inbtp.edu",
    "telephone": "+243900000001",
    "disponibilite": "mar-jeu"
  }
}
```

Les valeurs possibles pour `status` sont : `"pending"`, `"finish"`, `"no"` (même règle en création et en mise à jour).

**Remarque — données existantes :** si d’anciennes charges avaient un `status` booléen, il faut les mettre à jour en base (ex. `true` → `"pending"`, `false` → `"no"`) avant de resauver avec la validation actuelle.

#### Payload — suppression (`DELETE /api/charges/delete/:id`)

Aucun corps ; réponse `204 No Content` si succès, `404` si l’id n’existe pas.

---

### Fiche de cotation — notes (`/api/notes`)

La **fiche de cotation** côté API n’est pas un seul document : chaque **ligne** (étudiant + matière + unité + semestre) est stockée comme **un enregistrement** dans la collection `Notes`. Une fiche complète pour un étudiant = **plusieurs lignes**, une par association matière/contexte).

Les références (`matiere.reference`, `unite.reference`, `semestre.reference`) doivent **cohérer avec le référentiel** du student-service (_id utilisés dans les parcours) pour que jury et étudiants voient les mêmes codes.

#### Modèle JSON (corps pour création et structure en lecture brute)

| Champ | Type | Obligatoire | Description |
| :--- | :--- | :---: | :--- |
| `email` | string | oui | E-mail étudiant |
| `matricule` | string | oui | Matricule (index recherche) |
| `studentId` | string | oui | Identifiant métier étudiant |
| `studentName` | string | oui | Nom affiché |
| `semestre` | objet | oui | `designation`, `reference`, `credit` |
| `unite` | objet | oui | `designation`, `reference`, `code`, `credit` |
| `matiere` | objet | oui | `designation`, `reference`, `credit` |
| `cc` | number | non | Note contrôle continu (défaut `0`) |
| `examen` | number | non | Note examen session principale (défaut `0`) |
| `rattrapage` | number | non | Note rattrapage (défaut `0`) |
| `rachat` | number | non | Rachat / autre règle métier (défaut `0`) |

Les lectures **agrégées** (`/student/:matricule`, `/course/:courseRef`) restructurent ces lignes en arborescence **semestres → unités d’enseignement → éléments (matières)** avec les champs de notes sur chaque élément.

#### CRUD — tableau récapitulatif

| Opération | Méthode | Endpoint | Réponses habituelles |
| :--- | :--- | :--- | :--- |
| **Create** (unitaire) | `POST` | `/api/notes/add` | `201` + ligne créée (`_id`) |
| **Create** (bulk) | `POST` | `/api/notes/bulk` | `201` + `{ count, notes }` |
| **Read** (liste brute) | `GET` | `/api/notes/all` | `200` tableau de documents |
| **Read** (une ligne par `_id`) | `GET` | `/api/notes/:id` | `200` \| `404` \| `400` si id MongoDB invalide |
| **Read** (fiche structurée étudiant) | `GET` | `/api/notes/student/:matricule` | `200` \| `404` |
| **Read** (vue jury par cours) | `GET` | `/api/notes/course/:courseRef` | `200` \| `404` |
| **Read** (bulletin / résultat agrégé) | `GET` | `/api/notes/result/:matricule` | `200` \| `404` |
| **Update** (payload partiel ou complet) | `PUT` | `/api/notes/update/:id` | `200` mise à jour \| `404` \| `400` |
| **Delete** | `DELETE` | `/api/notes/delete/:id` | `204` \| `404` \| `400` |

Pour **Update**, seuls les champs envoyés sont fusionnés avec le document existant (`findByIdAndUpdate` avec validation Mongoose).

Pour **Delete**, réponse sans corps (`204 No Content`).

#### Création bulk — `POST /api/notes/bulk`

Corps au choix :

- un **tableau JSON** de lignes `[{ … }, { … }]`, ou  
- un objet `{ "notes": [ … ] }` avec le même schéma que `POST /api/notes/add`.

Réponse `201` : `{ "count": number, "notes": [ … documents Mongo ] }`. En cas de validation `insertMany`, réponse `400` avec `details`.

#### Envoi d’une note — unitaire (`POST /api/notes/add`)

Exemple minimal cohérent avec les tests automatisés :

```json
{
  "studentId": "STU-001",
  "studentName": "Kabengele Kabeya",
  "matricule": "2026-042",
  "email": "kabeya.kabengele@inbtp.ac.cd",
  "semestre": {
    "designation": "Semestre 1",
    "reference": "SEM-S1-2026",
    "credit": 30
  },
  "unite": {
    "designation": "Informatique fondamentale",
    "reference": "UE-INF-2026",
    "code": "UE-INF",
    "credit": 6
  },
  "matiere": {
    "designation": "Algorithmique",
    "reference": "MAT-ALGO-001",
    "credit": 4
  },
  "cc": 15,
  "examen": 12,
  "rattrapage": 0,
  "rachat": 0
}
```

#### Lecture / mise à jour / suppression par `_id`

Après `POST /add` ou `GET /all`, utiliser l’**`_id`** MongoDB de la ligne :

```http
GET /api/notes/507f1f77bcf86cd799439011
PUT /api/notes/update/507f1f77bcf86cd799439011
DELETE /api/notes/delete/507f1f77bcf86cd799439011
```

#### Envoi en **bulk** — alternative à plusieurs `POST /add`

Préférer **`POST /api/notes/bulk`** (corps = tableau de lignes ou `{ "notes": [ … ] }`). Sinon, enchaîner plusieurs `POST /api/notes/add` par paquets pour limiter la charge.

```javascript
const base = 'https://<hôte>/titulaire'; // préfixe gateway : adapter

async function sendNotesBulkApi(lines) {
  const r = await fetch(`${base}/api/notes/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lines), // ou { notes: lines }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { count, notes }
}

async function sendNotesOneByOneChunks(lines, chunkSize = 25) {
  const path = '/api/notes/add';
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((body) =>
        fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then((r) => {
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          return r.json();
        })
      )
    );
  }
}
```

Pour un **fichier CSV** (matricule, code matière, cc, examen, …), le script d’import doit mapper chaque ligne vers ce JSON (en récupérant `studentId`, `email`, références UE/semestre depuis votre annuaire ou le student-service).

#### Exemple — mise à jour partielle (`PUT /api/notes/update/:id`)

```json
{
  "cc": 14,
  "examen": 15,
  "rattrapage": 0
}
```

```json
{
  "studentId": "STU-001",
  "studentName": "Kabengele Kabeya",
  "matricule": "2026-042",
  "semestres": [
    {
      "_id": "SEM-S1-2026",
      "designation": "Semestre 1",
      "credit": 30,
      "unites": [
        {
          "_id": "UE-INF-2026",
          "code": "UE-INF",
          "designation": "Informatique fondamentale",
          "credit": 6,
          "elements": [
            {
              "_id": "MAT-ALGO-001",
              "designation": "Algorithmique",
              "credit": 4,
              "cc": 15,
              "examen": 12,
              "rattrapage": 0,
              "rachat": 0
            }
          ]
        }
      ]
    }
  ]
}
```

`GET /api/notes/course/:courseRef` renvoie un **tableau** d’objets de ce même format (un objet par étudiant concerné). `GET /api/notes/result/:matricule` renvoie l’arborescence de résultats avec totaux promotion et mentions (voir types `ResultatEtudiant` dans `src/services/note.manager.ts`).

---

### Séances et Présences (`/api/seances`, `/api/presences`)

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

### Activités et Résolutions (`/api/activites`, `/api/resolutions`)

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
