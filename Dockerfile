# --- Étape 1 : Build ---
FROM node:24.14.0-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration des dépendances
COPY package*.json ./

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN npm install

# Copier le reste du code source
COPY . .

# Compiler le projet TypeScript
RUN npm run build

# --- Étape 2 : Runtime ---
FROM node:24.14.0-alpine

WORKDIR /app

# Installer l'outil cross-env globalement pour le script start
RUN npm install -g cross-env

# Copier uniquement les fichiers nécessaires depuis l'étape de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/views ./dist/views
COPY --from=builder /app/src/public ./dist/public

# Exposer le port configuré (par défaut 3000)
EXPOSE 3000

# Définir les variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Commande pour démarrer l'application
CMD ["npm", "run", "start"]
