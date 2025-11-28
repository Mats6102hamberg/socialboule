# 🤖 AI Chatbot Guide

Din Boule-app har nu en AI-assistent som hjälper användare med allt från statistik till anmälningar!

## 🎯 Vad AI-assistenten kan göra

### 1. **Kommande kvällar**
```
"Vilka kvällar är det framöver?"
"När är nästa boule-kväll?"
"Finns det plats kvar på fredag?"
```

### 2. **Spelarstatistik**
```
"Hur spelar Johan?"
"Vad har Anna för statistik?"
"Visa mina resultat"
```

### 3. **Spelkemi & Rekommendationer**
```
"Vem spelar jag bäst med?"
"Vilka är bra lagkamrater?"
"Vem ska jag välja som partner?"
```

### 4. **Topplista**
```
"Vem är bäst i klubben?"
"Visa topplistan"
"Vilka ligger i topp?"
```

### 5. **Allmän information**
```
"Vilka spelare finns i klubben?"
"Hur fungerar poängsystemet?"
"Vad är skillnaden på dag och kväll?"
```

## 🚀 Setup - Så här aktiverar du AI:n

### Steg 1: Skaffa OpenAI API-nyckel

1. Gå till [platform.openai.com](https://platform.openai.com/)
2. Logga in eller skapa konto
3. Gå till **API Keys**
4. Klicka **Create new secret key**
5. Kopiera nyckeln (den börjar med `sk-`)

### Steg 2: Lägg till API-nyckel i miljövariabler

Öppna din `.env` fil och lägg till:

```bash
OPENAI_API_KEY="sk-din-openai-nyckel-här"
```

**OBS:** Se till att `.env` finns i `.gitignore` så du inte checkar in nyckeln!

### Steg 3: Starta om servern

```bash
npm run dev
```

## 💰 Kostnad

OpenAI API kostar pengar, men väldigt lite för normal användning:

- **GPT-4 Turbo:** ~$0.01 per 1000 tokens (ca 750 ord)
- En typisk konversation: $0.01 - $0.05
- 100 användare per månad: ~$5-20/månad

Tips för att hålla nere kostnaderna:
- Sätt upp spending limits i OpenAI dashboard
- Övervaka användning regelbundet
- Använd GPT-3.5-turbo istället om du vill spara (ändra i `/api/ai-chat/route.ts`)

## 🎨 UI-komponenten

Chatboten visas som en **floating bubble** längst ner till höger:
- Klicka för att öppna chatten
- Minimera när du inte använder den
- Fungerar på alla sidor (hem + admin)

## 🔧 Teknisk implementation

### Architecture

```
Frontend (AIChat.tsx)
    ↓
API Endpoint (/api/ai-chat)
    ↓
OpenAI GPT-4 Turbo + Function Calling
    ↓
Database Queries (Prisma)
```

### Tillgängliga funktioner för AI:n

1. `get_upcoming_nights` - Hämtar kommande kvällar
2. `get_player_stats` - Hämtar spelarstatistik
3. `get_player_chemistry` - Hämtar spelkemi
4. `get_all_players` - Listar alla spelare
5. `get_leaderboard` - Visar topplistan

### Lägg till nya funktioner

För att lägga till fler funktioner AI:n kan använda:

1. Öppna `/src/app/api/ai-chat/route.ts`
2. Lägg till funktion i `functions` arrayen
3. Implementera funktionen
4. Lägg till i `executeFunction` switch

Exempel:

```typescript
{
  name: "get_match_details",
  description: "Hämtar detaljer om en specifik match",
  parameters: {
    type: "object",
    properties: {
      matchId: {
        type: "string",
        description: "Match ID",
      },
    },
    required: ["matchId"],
  },
}
```

## 🐛 Felsökning

### AI:n svarar inte
- Kontrollera att `OPENAI_API_KEY` är satt i `.env`
- Kolla console för fel
- Verifiera att API-nyckeln är giltig

### "OpenAI API key not configured"
- Glöm inte att starta om servern efter `.env` ändring
- Kontrollera att variabelnamnet är exakt `OPENAI_API_KEY`

### Långsamma svar
- GPT-4 kan ta 2-5 sekunder
- Överväg GPT-3.5-turbo för snabbare svar
- Implementera streaming för bättre UX

## 🎯 Nästa steg - Utökad AI

Vill du bygga vidare? Här är förslag:

### 1. **Smart Matchmaking**
Låt AI:n skapa balanserade matcher baserat på spelares nivåer

### 2. **Match-förutsägelser**
"Vem vinner om Johan spelar mot Eva?"

### 3. **Personliga tips**
"Tips för att bli bättre baserat på din statistik"

### 4. **Röstinmatning**
Lägg till voice-to-text för händerna-fria frågor

### 5. **Bildanalys**
Låt AI räkna poäng från foto av kulorna

## 📝 Säkerhet

- API-nyckeln lagras säkert på servern (inte i klienten)
- Alla queries går genom Prisma (SQL injection-skydd)
- Rate limiting rekommenderas för produktion
- Överväg autentisering för känsliga funktioner

---

**Lycka till med din AI-drivna Boule-app! 🎱🤖**
