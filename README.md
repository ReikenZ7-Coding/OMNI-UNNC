# OMNI-UNNC

**Find a campus event, register in one tap, and get help, all in one place, signing in only once.**

OMNI is a working prototype built for our BUSI1116 project (Workshop 02, Problem A). Right now, UNNC event information is scattered across university email, Moodle, WeChat official accounts, club group chats and mini programs. Registering or asking for help sends students through links to separate portals that often make them log in again. OMNI tests the opposite: one app, one sign-in.

> This is a student prototype. It is not an official university service. Items marked **Live from UNNC website** are real and come from UNNC's public pages; Events, notices and news are **real only**: from UNNC's public website, official feeds, or posted by people in OMNI. Help and Tools show a "coming soon" page until their phase.

## What you can do in the app

| Screen | What it does |
| --- | --- |
| **Sign in** | Sign in once with your UNNC email and a 6-digit code (only @nottingham.edu.cn addresses work), after agreeing to a short privacy notice. OMNI never asks for a university password. Every other screen trusts that sign-in, so you are never asked again. In this demo the code is shown on screen instead of being emailed. |
| **Home** | Featured events and news, a Quick access grid you can edit, your next tickets, and the latest campus notices. |
| **Discover** | One feed of events, notices and news from all five places students used to check. Switch each type on or off, search, filter by topic, date or original source, and sort. |
| **Event details** | Generated poster, time, place, organiser and places left, a 中文 / English switch for the description, and a bottom bar to **Save**, **Add reminder** and **Register in one tap** right inside the app. If it's full, the same tap joins the waitlist. |
| **Help** | *Coming in Phase 2.* Type a problem in plain words and OMNI routes it to the right office. The routing logic is already in `js/logic.js` (`routeHelp`). |
| **Tools** | *Coming in Phase 3.* Campus systems in one place, each opening already signed in. |
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

1. **Real UNNC news and events, updated automatically.** `tools/crawl.js` reads UNNC's *public* web pages ([University News](https://www.nottingham.edu.cn/en/press-release/news-listing.aspx), [Faculty news](https://www.nottingham.edu.cn/en/university-life/news/index.aspx), [University Events](https://www.nottingham.edu.cn/en/events/event-listing.aspx), the Science & Engineering events page and [Key Dates](https://www.nottingham.edu.cn/en/about/key-dates/key-dates.aspx), which become events for semesters, exams, registration and holidays). GitHub runs it every 30 minutes (`.github/workflows/crawl.yml`) and saves the results to `data/live.json`. When OMNI is served from a website, it loads that file and checks again every 10 minutes. These items are marked **Live from UNNC website** and link back to the original page.
2. **Posts made in OMNI.** Tap **Post** on Discover to add an event, notice or news story. In the shared claude.ai version, posts are saved to a shared database, so everyone using that link sees them straight away, and registration counts update live. In the GitHub version (no database), posts are saved on your own device only.
There is no made-up content in the app. The made-up events used by the automatic checks live in `tests/fixtures.js`, and the draft offices, tools and food lists for later phases stay in `js/data.js` without being shown.

Limits: the crawler can only read public pages, not Moodle, email or WeChat. Keep it polite (a handful of pages every 30 minutes) and always link back to the source. Run it yourself with `npm run crawl`.

### Feeds from official accounts (RSS)

If a UNNC WeChat official account, the Student Union or a department has an RSS or Atom feed (for example from a public WeChat-to-RSS service), add it to `data/feeds.json`:

```json
{ "feeds": [
  { "name": "宁诺就业", "url": "https://example.com/feed.xml", "kind": "news", "topic": "careers" }
] }
```

The crawler reads each feed every 30 minutes and keeps **only the headline, date and link**, never the article itself. In OMNI the item says "Live from WeChat" and has a **Read on WeChat** button, so students read the full post where it was published. That keeps OMNI a way to *find* things, not a copy of WeChat. Please don't add feeds made by logging into WeChat with a "burner" account or by getting around WeChat's anti-bot protections.

**Try a feed before adding it.** On GitHub, open **Actions → Update live UNNC data → Run workflow**, paste the feed link into the box and press **Run workflow**. Open the finished run and expand **Try a feed**: it lists the posts OMNI would show. Nothing is saved. On your own computer, `node tools/crawl.js --test-feed <link>` does the same.

### WeChat, email and Moodle: let students bring it in

Those sources are behind logins, so OMNI never asks for anyone's UNNC password and never reads private chats. Instead, the student who already has the information brings it in, in a few seconds:

- **Fill it in for me** (on the Post screen). Paste a WeChat article or email, or add a screenshot of the poster. In the claude.ai version, Claude reads it (including the picture) and fills in the form. Everywhere else, a built-in "quick fill" finds the title, date, time, place and organiser in pasted text, in English or Chinese (`guessFromText` in `js/logic.js`). The person always checks the form before posting. If the post has an original (a WeChat article, a UNNC portal page, a Moodle page or a sign-up form), its link goes in **Link to the original**, and OMNI shows a button like **Read on WeChat** or **Open in the UNNC portal**. OMNI keeps a short summary and sends people to the original for the full article, so it helps students find things without copying or replacing the source.
- **My calendar** (Me → My calendar). In Moodle, *Calendar → Import or export calendars → Export calendar* gives a `.ics` file. Import it (or a timetable `.ics`) and OMNI shows your classes and deadlines next to the events you've registered for, and in the Timetable tool. The file is read on the phone and stays there (`parseICS` in `js/logic.js`).

### Put OMNI online with GitHub Pages (free)

1. In this repo on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch `claude/project-thread-oqbjhd` and the folder `/ (root)`, then **Save**.
3. After a minute, OMNI is live at `https://reikenz7-coding.github.io/OMNI-UNNC/`. Each time the crawler finds something new, the site updates by itself.

## Roadmap

1. **Events, notices and news** (live now)
2. **Help**: ask the right office in plain words
3. **Tools**: campus systems in one place
4. **UNNC Forum**: a student social feed, for verified UNNC students only
5. **Chatbot**

## How the code is organised

```
index.html           the page itself
css/app.css          all the styling (colours, light and dark mode)
js/data.js           offices, help answers, tools and food (sample)
js/logic.js          search, filters, one-tap registration, help routing (no screen code)
js/icons.js          the line icons
js/app.js            draws each screen and handles taps
tests/logic.test.js  automatic checks for logic.js
tools/crawl.js       reads UNNC's public news and events pages into data/live.json
data/live.json       the latest crawled news and events (updated by GitHub every 30 min)
tools/build-preview.js  bundles everything into one file for sharing
```

**Colours follow 60-30-10:** 60% warm paper (backgrounds and cards), 30% deep jade (text accents, tiles, posters) and 10% signal orange, used only for main buttons, live dots and things that need attention (full, due, errors). They are set once at the top of `css/app.css`.

No frameworks and no build step: it is plain HTML, CSS and JavaScript, so anyone on the team can open a file and change it.

- **Add an event:** post it in the app (Discover → Post), or add a feed to `data/feeds.json`.
- **Teach the help desk a new word:** add it to an office's `keywords` list in `js/data.js`.
- **Run the checks:** `npm test`.
- **Make a single shareable file:** `npm run build:preview` writes `dist/preview.html`.

## What a real version would need

1. **Real email codes.** The screens are ready; the missing piece is a small server that emails the code (for example Cloudflare Workers + Resend, plus a domain at about $10 a year). It should keep each code for 10 minutes, allow 5 tries, send at most 3 codes per email per hour, and never send the code back to the app. The rules are already in `js/logic.js` (`unncEmail`, `checkCode`, `sendWait`). Moodle and the portal stay separate: OMNI opens the official page and the student logs in there, so OMNI never holds a university password or cookie. Longer term, the university's own single sign-on would be the ideal.
2. **Real event data.** Let clubs, the Student Union and departments post events into OMNI (or pull them from existing systems) instead of typing them into `data.js`.
3. **A small server and database** so bookings and help requests reach the real organisers and offices.
4. **A WeChat mini program version.** Most UNNC students live in WeChat, so that is where OMNI should end up. The logic in `js/logic.js` is plain JavaScript and can be reused there.

## Ideas to test with students

- Time how long it takes to find and register for an event in OMNI versus the current way.
- Ask first-year students to use **Help** with a real problem and see if it sends them to the right office.
- Count how many times they had to log in.
