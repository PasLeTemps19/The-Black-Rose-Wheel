# La Roue — version auto-hébergée

Aucune dépendance : il suffit de Node.js 18 ou plus.

## Lancer en local
    ADMIN_PASSWORD=monmotdepasse node server.js
puis ouvre http://localhost:3000

## Mettre en ligne (Render, Railway, Fly.io, un VPS...)
- Commande de démarrage : `node server.js`
- Variable d'environnement obligatoire : `ADMIN_PASSWORD` (ton mot de passe admin)
- Le port est lu automatiquement via `PORT`.

Sur un hébergeur gratuit, le disque est souvent effacé à chaque redémarrage :
la liste des noms peut alors être perdue (fichier data.json).
Si le service passe par un proxy, garde les connexions longues actives (SSE sur /events).
