# Setup Guide - Socialboule

Detta dokument beskriver hur du sätter upp autentisering och admin-behörigheter i Socialboule.

## Steg 1: Kör databasmigrering

Efter att du har uppdaterat koden, kör migreringen för att lägga till `isAdmin`-fältet till Player-tabellen:

```bash
cd socialboule
npx prisma migrate dev
```

Detta kommer att applicera migreringen `20251128135851_add_is_admin_to_player`.

## Steg 2: Installera beroenden

Om du inte redan har tsx installerat:

```bash
npm install
```

## Steg 3: Sätt första admin-användare

### Alternativ A: Om du har en tom databas

Kör seed-scriptet som skapar en admin-spelare:

```bash
npm run db:seed
```

Detta skapar en spelare med namnet "Admin" som har admin-rättigheter. **Glöm inte att ändra namnet** till ditt riktiga namn via UI eller databas.

### Alternativ B: Om du redan har spelare i databasen

1. Logga in i Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Öppna Player-tabellen

3. Hitta din spelare och sätt `isAdmin` till `true`

**ELLER** använd Prisma CLI direkt:

```bash
# Lista alla spelare för att hitta ditt ID
npx prisma db execute --stdin <<< 'SELECT id, name FROM "Player";'

# Sätt en spelare som admin (ersätt PLAYER_ID med rätt ID)
npx prisma db execute --stdin <<< "UPDATE \"Player\" SET \"isAdmin\" = true WHERE id = 'PLAYER_ID_HERE';"
```

## Steg 4: Testa autentiseringen

1. Starta dev-servern:
   ```bash
   npm run dev
   ```

2. Öppna appen i webbläsaren: `http://localhost:3000`

3. Välj din spelare (som har admin-rättigheter)

4. Du ska nu kunna:
   - Skapa nya boule-kvällar
   - Skapa och redigera lag
   - Lotta rundor
   - Ta bort kvällar och lag

5. Om du försöker utföra dessa operationer utan att vara inloggad eller utan admin-rättigheter får du:
   - **401 Unauthorized** - Du är inte inloggad
   - **403 Forbidden** - Du är inloggad men saknar admin-rättigheter

## Viktiga endpoints som nu kräver admin-rättigheter

### Kräver admin:
- `POST /api/boule-nights` - Skapa ny kväll
- `PATCH /api/boule-nights/[id]` - Redigera kväll
- `DELETE /api/boule-nights/[id]` - Ta bort kväll
- `POST /api/boule-nights/[id]/draw-round-1` - Lotta rund 1
- `POST /api/boule-nights/[id]/draw-round-2` - Lotta rund 2
- `POST /api/boule-nights/[id]/draw-round-3` - Lotta rund 3
- `POST /api/boule-nights/[id]/draw-team-round` - Lotta lagrunda
- `POST /api/boule-nights/[id]/reset-round` - Återställ runda
- `POST /api/teams` - Skapa nytt lag
- `PUT /api/teams/[id]` - Uppdatera lag
- `DELETE /api/teams/[id]` - Ta bort lag

### Tillgängligt för alla (utan login):
- `GET /api/boule-nights` - Lista kvällar
- `GET /api/boule-nights/[id]` - Hämta specifik kväll
- `GET /api/players` - Lista spelare
- `GET /api/teams` - Lista lag
- `GET /api/teams/[id]` - Hämta specifikt lag
- `POST /api/boule-nights/[id]/attendance` - Spara närvaro
- `PATCH /api/matches/[id]` - Rapportera matchresultat

## Säkerhetsfunktioner som implementerats

### 1. Session-baserad autentisering
- HTTP-only cookies för sessioner (30 dagars livstid)
- Secure cookies i production
- Session API: `/api/auth/session` (GET, POST, DELETE)

### 2. Admin-rollkontroll
- `isAdmin`-fält i Player-modellen
- `requireAdmin()` helper som validerar både login och admin-status
- Korrekt felhantering (401 vs 403)

### 3. Optimistic locking för närvaroregistrering
- Förhindrar race conditions när flera personer uppdaterar närvaro samtidigt
- Använder `updatedAt`-timestamp för konfliktdetektering
- Returnerar HTTP 409 Conflict vid samtidiga ändringar

### 4. Server-side validering
- maxPlayers valideras på servern (inte bara klient)
- Walkover-resultat valideras till exakt 13-0 eller 0-13
- ID-parametrar valideras med Next.js params istället för custom parsing

## Felsökning

### Problem: "Unauthorized: You must be logged in"
- Lösning: Välj din spelare på startsidan för att logga in

### Problem: "Forbidden: Admin access required"
- Lösning: Din spelare har inte admin-rättigheter. Följ Steg 3 ovan för att ge dig själv admin.

### Problem: "Närvarolistan har ändrats av någon annan"
- Lösning: Detta är expected behavior vid samtidig uppdatering. Ladda om sidan och försök igen.

### Problem: Kan inte köra seed-scriptet
- Kontrollera att tsx är installerat: `npm list tsx`
- Om inte, kör: `npm install`

## Nästa steg (TODO)

- [ ] Lägg till UI-indikator för admin-status
- [ ] Lägg till "Hantera admins"-sida för befintliga admins
- [ ] Implementera mer granulära roller (t.ex. "organizer" vs "super admin")
- [ ] Lägg till audit log för admin-operationer
- [ ] Implementera session timeout och refresh
