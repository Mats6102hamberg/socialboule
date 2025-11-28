## Boule-kväll – utvecklingssetup

Det här är ett Next.js 16-projekt med Prisma/PostgreSQL-backend för att planera och administrera boule-kvällar.

### Förkrav

- Node.js 20+
- PostgreSQL-databas (t.ex. Neon) med giltig `DATABASE_URL`

### Installation

1. Installera beroenden:
   ```bash
   npm install
   ```
2. Lägg till en `.env` med dina hemligheter (se `.env.example`).
3. Generera Prisma-klienten:
   ```bash
   npx prisma generate
   ```
4. Starta dev-servern:
   ```bash
   npm run dev
   ```

### Tillgängliga script

| Kommando        | Beskrivning                     |
| --------------- | ------------------------------- |
| `npm run dev`   | Startar Next.js i dev-läge      |
| `npm run build` | Bygger produktion               |
| `npm run start` | Startar byggd app               |
| `npm run lint`  | ESLint enligt Next core vitals  |

### Prisma & databas

- Schema: `prisma/schema.prisma`
- Migrationer: `prisma/migrations`
- CLIs: `npx prisma migrate dev`, `npx prisma studio`

#### Senaste schemaändringar

Kör följande efter att du har uppdaterat koden för att få in nya tabellerna för resultatbekräftelser och bye-hantering:

```bash
npx prisma migrate dev --name add-result-confirmations-and-byes
npx prisma generate
```

Om du kör mot en delad databas (t.ex. staging/prod) – generera SQL och applicera manuellt:

```bash
npx prisma migrate deploy
```

### Miljövariabler

| Variabel        | Beskrivning                         |
| --------------- | ----------------------------------- |
| `DATABASE_URL`  | Postgres-anslutning (kräver SSL)    |

### Deployment

Bygg med `npm run build` och starta med `npm run start`. Miljövariabler måste vara satta på målmiljön.
