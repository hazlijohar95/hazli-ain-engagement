# Hazli & Ain · Engagement invitation

A mobile-first digital invitation: React + Vite on Cloudflare Workers (static assets), Convex for RSVPs and wishes.

## What guests get

- The invitation opens straight on the first page. A violin cover of "Binks' Sake" (`public/music/binks-sake.mp3`, played by `src/lib/music.ts`) starts on their first tap (browsers keep sound off until then) and loops; the music button turns it and the interface sounds off. The file only downloads once the music starts. The MP3 is a commercial recording, so it is not in this repository: put your own track at `public/music/binks-sake.mp3` before deploying.
- Names, date, a countdown in Malaysia time, the venue with Google Maps and Apple Maps links, and Add to calendar (Google Calendar, an `.ics` file for Apple Calendar, or Outlook).
- RSVP in a bottom sheet. Each phone number holds one response, so sending again updates the earlier answer.
- A live wishes wall.

## Where things live

| Change | File |
| --- | --- |
| Names, date, time, venue, address, RSVP deadline | `src/event.ts` |
| Maximum guests per RSVP | `src/event.ts` (`MAX_GUESTS`) and `convex/limits.ts` (`maxGuests`) |
| Logo (embroidery hoop, H&A) | `src/logo/HoopMark.tsx`; the letters come from `npm run hoop-glyphs` |
| Colours, type, layout | `src/styles.css` (tokens at the top) |
| Backend | `convex/` |

After changing names, date or venue, regenerate the link preview image and the home-screen icon:

```bash
npm run og
```

## Guest list

Open `/admin` on the live site and enter the admin key. It shows totals, each RSVP with a WhatsApp link, a CSV download, and a switch to hide any wish.

## Run locally

```bash
npm install
```

```bash
npx convex dev
```

```bash
npm run dev
```

## Deploy

The `.env.local` created during development points at a local Convex backend, so never upload a plain `npm run build`. Always use `npm run deploy`, which builds against the production Convex URL.

One-time setup:

1. Link a Convex cloud project. Log in when asked, and pick or create the project.

```bash
npx convex dev --configure new --once
```

2. Set the admin key for the live guest list.

```bash
npx convex env set ADMIN_KEY "choose-a-long-secret" --prod
```

3. Put the site's public address in `.env` as `VITE_SITE_URL`, for example `https://hazli-ain-engagement.<your-subdomain>.workers.dev`. Link previews on WhatsApp need it to show the image.

4. Log in to Cloudflare.

```bash
npx wrangler login
```

Every deploy after that pushes the Convex functions, builds with the production Convex URL and uploads to Cloudflare:

```bash
npm run deploy
```

To use a custom domain, add it in the Cloudflare dashboard under Workers & Pages, then hazli-ain-engagement, then Settings, then Domains & Routes. Then update `VITE_SITE_URL` and deploy again.
