# OMNI-UNNC

**Find a campus event, register in one tap, and get help, all in one place, signing in only once.**

OMNI is a working prototype built for our BUSI1116 project (Workshop 02, Problem A). Right now, UNNC event information is scattered across university email, Moodle, WeChat official accounts, club group chats and mini programs. Registering or asking for help sends students through links to separate portals that often make them log in again. OMNI tests the opposite: one app, one sign-in.

> This is a student prototype. All events, offices and answers are **sample data** written for testing. It is not an official university service.

## What you can do in the app

| Screen | What it does |
| --- | --- |
| **Sign in** | Sign in once (demo: name + student ID, no password). Every other screen trusts that sign-in, so you are never asked again. |
| **Home** | Featured events and news, a Quick access grid you can edit, your next tickets, and the latest campus notices. |
| **Discover** | One feed of events, notices and news from all five places students used to check. Switch each type on or off, search, filter by topic, date or original source, and sort. |
| **Event details** | Generated poster, time, place, organiser and places left, a 中文 / English switch for the description, and a bottom bar to **Save**, **Add reminder** and **Register in one tap** right inside the app. If it's full, the same tap joins the waitlist. |
| **Help** | Type a problem in plain words ("my dorm air conditioner is broken", "签证") and OMNI tells you which office handles it, shows quick answers, and lets you send that office a request without logging in again. |
| **Tools** | A searchable directory of campus systems with favourites. Each one opens already signed in. Timetable, room booking (one tap per slot), printing credit and a building finder work in the demo. |
| **Food** | Campus places to eat, shops with opening hours, and a "What to eat" picker. |
| **Me** | Verified profile, My schedule, tickets, saved items, help requests, and settings (theme, description language, reminder timing). |

### How OMNI differs from other campus mini programs

Most campus apps collect links: you find an event, then tap "Registration options" and land in another portal that asks you to log in again. OMNI's bet is that the student signs in **once**, and registering, booking a room or asking an office for help all happen **inside** OMNI with that one sign-in.

## How to try it

**Easiest:** double-click `index.html`. It opens in your browser and works straight away. On your phone it looks and feels like an app.

**Or run a small local server** (needs [Node.js](https://nodejs.org)):

```bash
npm start        # then open the address it prints, e.g. http://localhost:3000
```

Everything you do (bookings, requests) is saved in your own browser only. Use **Me → Settings → Reset demo data** to start over.

## How the code is organised

```
index.html           the page itself
css/app.css          all the styling (colours, light and dark mode)
js/data.js           sample events, notices, news, offices, tools and food  <- edit this to add content
js/logic.js          search, filters, one-tap registration, help routing (no screen code)
js/icons.js          the line icons
js/app.js            draws each screen and handles taps
tests/logic.test.js  automatic checks for logic.js
tools/build-preview.js  bundles everything into one file for sharing
```

No frameworks and no build step: it is plain HTML, CSS and JavaScript, so anyone on the team can open a file and change it.

- **Add an event:** copy one block in `js/data.js`. `day: 3` means "three days from today", so the demo always looks current.
- **Teach the help desk a new word:** add it to an office's `keywords` list in `js/data.js`.
- **Run the checks:** `npm test`.
- **Make a single shareable file:** `npm run build:preview` writes `dist/preview.html`.

## What a real version would need

1. **Real single sign-on.** Swap the demo sign-in for the university's own login (UNNC IT runs it), so every feature trusts one account. This is the root cause we identified in Workshop 02.
2. **Real event data.** Let clubs, the Student Union and departments post events into OMNI (or pull them from existing systems) instead of typing them into `data.js`.
3. **A small server and database** so bookings and help requests reach the real organisers and offices.
4. **A WeChat mini program version.** Most UNNC students live in WeChat, so that is where OMNI should end up. The logic in `js/logic.js` is plain JavaScript and can be reused there.

## Ideas to test with students

- Time how long it takes to find and register for an event in OMNI versus the current way.
- Ask first-year students to use **Help** with a real problem and see if it sends them to the right office.
- Count how many times they had to log in.
