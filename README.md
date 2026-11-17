# OMNI-UNNC

**Find a campus event, register in one tap, and get help, all in one place, signing in only once.**

OMNI is a working prototype built for our BUSI1116 project (Workshop 02, Problem A). Right now, UNNC event information is scattered across university email, Moodle, WeChat official accounts, club group chats and mini programs. Registering or asking for help sends students through links to separate portals that often make them log in again. OMNI tests the opposite: one app, one sign-in.

> This is a student prototype. All events, offices and answers are **sample data** written for testing. It is not an official university service.

## What you can do in the app

| Screen | What it does |
| --- | --- |
| **Sign in** | Sign in once (demo: name + student ID, no password). Every other screen trusts that sign-in, so you are never asked again. |
| **Discover** | One feed of events from all five places students used to check. Search, filter by category (Academic, Careers, Clubs & societies, Sports, Culture, Wellbeing), by date, or show only events with places left. |
| **One-tap registration** | Tap **Register** right in the feed. If an event is full, the same tap puts you on the waitlist. You get a ticket with a check-in code. |
| **My events** | Your tickets, upcoming and past. Cancel from the event page. |
| **Help** | Type your problem in plain words ("my dorm air conditioner is broken", "签证") and OMNI tells you which office handles it, shows quick answers, and lets you send that office a request without logging in again. |
| **Me** | Your profile, how many sign-ins it took (one!), and a reset button for the demo. |

## How to try it

**Easiest:** double-click `index.html`. It opens in your browser and works straight away. On your phone it looks and feels like an app.

**Or run a small local server** (needs [Node.js](https://nodejs.org)):

```bash
npm start        # then open the address it prints, e.g. http://localhost:3000
```

Everything you do (bookings, requests) is saved in your own browser only. Use **Me → Reset demo data** to start over.

## How the code is organised

```
index.html           the page itself
css/app.css          all the styling (colours, light and dark mode)
js/data.js           sample events, offices and FAQ answers  <- edit this to add events
js/logic.js          search, filters, one-tap registration, help routing (no screen code)
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
