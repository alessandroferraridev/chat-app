# Chat App

Side project sperimentale per testare una chat realtime con stack Laravel + React.

> Nota: questo repository **non è un progetto serio/production-ready** ma è usato come playground tecnico.

## Stack Tecnico

- Backend: `Laravel 12` (PHP `^8.2`)
- Frontend: `React 19` + `TypeScript` + `Inertia.js`
- Build tool: `Vite 7`
- Styling: `Tailwind CSS 4`
- State/data fetching frontend: `@tanstack/react-query`, `@tanstack/react-form`, `zustand`
- Realtime: `Laravel Reverb` + `laravel-echo` + `pusher-js`
- Database:
  - sviluppo locale: `SQLite` (default in `.env.example`)
  - container/prod-like: `PostgreSQL 16` (via `docker-compose`)

## Funzionalita Implementate

- Login passwordless con magic link via email
- Creazione conversazioni 1:1 da email destinatario
- Lista conversazioni con preview ultimo messaggio
- Invio/ricezione messaggi realtime
- Badge messaggi non letti in sidebar
- Paginazione incrementale (infinite scroll) per:
  - conversazioni
  - storico messaggi

## Architettura Applicativa

- Routing web + pagine Inertia in `routes/web.php`
- Endpoint API in `routes/api.php`
- Controller principali:
  - `app/Http/Controllers/AuthController.php`
  - `app/Http/Controllers/ChatController.php`
- Eventi broadcast realtime:
  - `app/Events/ConversationCreated.php`
  - `app/Events/MessageSent.php`
- Modelli principali:
  - `app/Models/Conversation.php`
  - `app/Models/Message.php`
  - `app/Models/MagicLink.php`

## Flusso Realtime

- Backend pubblica eventi su canali:
  - `user.{id}` per aggiornamenti conversazioni/notifiche
  - `conversation.{id}` per nuovi messaggi della conversazione
- Frontend inizializza Echo in `resources/js/bootstrap.ts`
- UI ascolta eventi e sincronizza cache React Query senza reload pagina

## Schema Dati (high-level)

- `users`
- `magic_links`
- `chat_conversations`
- `chat_conversation_user` (pivot molti-a-molti partecipanti)
- `chat_messages`

## Setup Locale (senza Docker)

Prerequisiti minimi:

- PHP `8.2+`
- Composer
- Node.js `18+` (o compatibile con Vite 7)

Installazione rapida:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run dev
```

In un secondo terminale (realtime):

```bash
php artisan reverb:start --host=0.0.0.0 --port=9000
```

App web: `http://localhost:8000` (se avviata con `php artisan serve`).

## Setup con Docker

Servizi definiti in `docker-compose.yml`:

- `app` (Laravel + frontend buildato)
- `queue` (worker)
- `reverb` (websocket server)
- `db` (PostgreSQL)
- `migrate` (profilo tools)

Comandi base:

```bash
docker compose up -d --build
docker compose --profile tools run --rm migrate
```

## API Principali

Auth:

- `POST /api/auth/magic-link`
- `POST /auth/verify/{token}`
- `POST /logout`

Chat:

- `GET /api/chat/conversations`
- `POST /api/chat/conversations`
- `GET /api/chat/conversations/{conversation}/messages`
- `POST /api/chat/conversations/{conversation}/messages`

## Stato del Progetto

- Progetto personale, in evoluzione continua.
- Possibili breaking changes senza preavviso.
- Non ottimizzato per sicurezza/scala da produzione.

## Licenza

Questo progetto e distribuito sotto licenza **MIT**.

Se vuoi riutilizzarlo, aggiungi/usa un file `LICENSE` con testo MIT standard.

## TODO
- Migliorare caricamenti
- Anziché creare subito la conversazione con qualcuno, crearla nel momento in cui viene inviato il primo messaggio
- Chat di gruppo
- Invio media
