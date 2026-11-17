# OMNI-UNNC

**Find a campus event, register in one tap, and get help, all in one place, signing in only once.**

OMNI is a working prototype built for our BUSI1116 project (Workshop 02, Problem A). Right now, UNNC event information is scattered across university email, Moodle, WeChat official accounts, club group chats and mini programs. Registering or asking for help sends students through links to separate portals that often make them log in again. OMNI tests the opposite: one app, one sign-in.

> This is a student prototype. It is not an official university service. Items marked **Live from UNNC website** are real and come from UNNC's public pages; everything else (offices, food, most events) is **sample data** written for testing.

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
| **Post** | Anyone can post an event, notice or news. **Fill it in for me:** paste a WeChat post or email, or add a poster screenshot, and OMNI fills in the form (title, date, time, place, organiser, English and Chinese description) for you to check. |
| **Me** | Verified profile, My schedule, **My calendar** (import Moodle deadlines and your timetable), tickets, saved items, help requests, and settings. |

### How OMNI differs from other campus mini programs

Most campus apps collect links: you find an event, then tap "Registration options" and land in another portal that asks you to log in again. OMNI's bet is that the student signs in **once**, and registering, booking a room or asking an office for help all happen **inside** OMNI with that one sign-in.

## How to try it

**Easiest:** double-click `index.html`. It opens in your browser and works straight away. On your phone it looks and feels like an app.

**Or run a small local server** (needs [Node.js](https://nodejs.org)):

```bash
npm start        # then open the address it prints, e.g. http://localhost:3000
```

Everything you do (bookings, requests) is saved in your own browser only. Use **Me → Settings → Reset demo data** to start over.

## Live data: how OMNI stays up to date

OMNI mixes three kinds of content:

1. **Real UNNC news and events, updated automatically.** `tools/crawl.js` reads UNNC's *public* web pages ([University News](https://www.nottingham.edu.cn/en/press-release/news-listing.aspx), [University Events](https://www.nottingham.edu.cn/en/events/event-listing.aspx) and the Science & Engineering events page). GitHub runs it every 30 minutes (`.github/workflows/crawl.yml`) and saves the results to `data/live.json`. When OMNI is served from a website, it loads that file and checks again every 10 minutes. These items are marked **Live from UNNC website** and link back to the original page.
2. **Posts made in OMNI.** Tap **Post** on Discover to add an event, notice or news story. In the shared claude.ai version, posts are saved to a shared database, so everyone using that link sees them straight away, and registration counts update live. In the GitHub version (no database), posts are saved on your own device only.
3. **Sample content** (made-up events, offices, food and so on), so every screen has something to show.

Limits: the crawler can only read public pages, not Moodle, email or WeChat. Keep it polite (a handful of pages every 30 minutes) and always link back to the source. Run it yourself with `npm run crawl`.

### WeChat, email and Moodle: let students bring it in

Those sources are behind logins, so OMNI never asks for anyone's UNNC password and never reads private chats. Instead, the student who already has the information brings it in, in a few seconds:

- **Fill it in for me** (on the Post screen). Paste a WeChat article or email, or add a screenshot of the poster. In the claude.ai version, Claude reads it (including the picture) and fills in the form. Everywhere else, a built-in "quick fill" finds the title, date, time, place and organiser in pasted text, in English or Chinese (`guessFromText` in `js/logic.js`). The person always checks the form before posting. If the post has an original (a WeChat article, a UNNC portal page, a Moodle page or a sign-up form), its link goes in **Link to the original**, and OMNI shows a button like **Read on WeChat** or **Open in the UNNC portal**. OMNI keeps a short summary and sends people to the original for the full article, so it helps students find things without copying or replacing the source.
- **My calendar** (Me → My calendar). In Moodle, *Calendar → Import or export calendars → Export calendar* gives a `.ics` file. Import it (or a timetable `.ics`) and OMNI shows your classes and deadlines next to the events you've registered for, and in the Timetable tool. The file is read on the phone and stays there (`parseICS` in `js/logic.js`).

### Put OMNI online with GitHub Pages (free)

1. In this repo on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch `claude/project-thread-oqbjhd` and the folder `/ (root)`, then **Save**.
3. After a minute, OMNI is live at `https://reikenz7-coding.github.io/OMNI-UNNC/`. Each time the crawler finds something new, the site updates by itself.

## How the code is organised

```
index.html           the page itself
css/app.css          all the styling (colours, light and dark mode)
js/data.js           sample events, notices, news, offices, tools and food  <- edit this to add content
js/logic.js          search, filters, one-tap registration, help routing (no screen code)
js/icons.js          the line icons
js/app.js            draws each screen and handles taps
tests/logic.test.js  automatic checks for logic.js
tools/crawl.js       reads UNNC's public news and events pages into data/live.json
data/live.json       the latest crawled news and events (updated by GitHub every 30 min)
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
