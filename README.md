# AW-dags 🍻 — privat beta

En Next.js-prototyp med responsiv design, Google-login, privata grupper, inbjudningslänkar, gruppchatt, AW-inbjudningar, konfetti och JA/NEJ-svar. Startsidan innehåller DEMOBARER med DEMOPRISER, inte verifierad Stockholmsdata.

## Starta lokalt

1. Installera Node.js 20+.
2. Kör `npm install` och `npm run dev` i projektmappen.
3. Öppna http://localhost:3000. Utan Supabase visas en begränsad förhandsvisning.

## Koppla riktig databas och Google-login

1. Skapa ett Supabase-projekt.
2. Kör `supabase/schema.sql` i Supabase SQL Editor.
3. Kopiera `.env.example` till `.env.local` och fyll i projektets URL och **publishable/anon** key. Använd ALDRIG service-role-nyckeln i frontend.
4. Aktivera Google i Supabase Authentication > Providers. Skapa OAuth-klient i Google Cloud och lägg in Supabase callback-URL enligt Supabase-guiden. Lägg till localhost och produktionsdomänen som tillåtna redirect URLs i Supabase.
5. Starta om `npm run dev`. Logga in och skapa första gruppen.
6. Aktivera Realtime för tabellerna `messages` och `invitations` i Supabase Dashboard.

## Viktigt: vad som inte är klart än

- **Automatiska e-postnotiser skickas inte ännu.** Skapa en säker Supabase Edge Function eller Next.js serverfunktion som triggas på nya inbjudningar och skickar via t.ex. Resend. Lägg in rate limiting, hantering av samtycke och undvik dubbletter.
- **Ölradarn använder exempelbarer och exempelpriser** tills verifierad datakälla eller modererat användarrapporteringssystem har byggts. Öppettider och närmast kräver plats-/kart-API och geolokalisering med samtycke.
- **Privat beta** betyder privata grupper, inte att registrering är begränsad. Begränsa Google-inloggning till en allowlist/domän i en server-side auth-hook om bara inbjudna ska få skapa konto.
- Chatten har grundläggande RLS och realtime, men behöver moderering, rapportering, pagination och spam-skydd innan publik lansering.
- RSVP-uppdatering fungerar med RLS; mejlpåminnelser och riktig konfetti-animation kan vidareutvecklas.
- Inbjudningar visas i gruppen; mejl och direkta länkar till enskilda AW:s återstår.

## Nästa steg

Prioritera: 1) Google/Supabase-konfiguration, 2) mejlfunktion och unika inbjudningslänkar, 3) riktig barlista med verifierade priser, 4) kartvy och filter, 5) AW-roulette och betyg.
