# Putting OMNI online for real students

This guide turns OMNI from a demo into a real website that students can use. Once it's done:

- students sign in with a code emailed to their UNNC address
- posts and registrations are shared with everyone
- the newest UNNC news and events go live by themselves

It takes about 20 minutes, and everything in it is free. You only need to do it once.

There are four parts. Do them in order.

---

## Part 1. Turn on the website (1 minute)

1. Open the repository on GitHub. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab, click **Publish website** on the left, then **Run workflow**.

After about a minute, OMNI is live at:
**https://reikenz7-coding.github.io/OMNI-UNNC/**

At this point it still works as a demo: the code shows on screen, and posts stay on each phone. Parts 2 to 4 make it real.

---

## Part 2. Create the Supabase project (10 minutes)

Supabase looks after sign-in and the shared database for us.

1. Go to **supabase.com** and sign up. Signing in with GitHub is fine.
2. Click **New project** and fill it in:
   - **Name:** `omni-unnc`
   - **Database password:** make a strong one and save it in your password manager. You won't need to give it to anyone.
   - **Region:** Southeast Asia (Singapore). It's the closest to Ningbo.
   - **Plan:** Free.
3. Wait for the project to finish setting up (about 2 minutes).
4. Open **SQL Editor**, then click **New query**.
5. Open `supabase/setup.sql` from this repository and copy all of it into the editor. Press **Run**. You should see "Success. No rows returned".

   This creates the posts and registrations tables and the safety rules:
   - anyone can read posts
   - only UNNC emails can sign in, post or register
   - people can only change their own things

6. Go to **Authentication → Sign In / Providers → Email**. Make sure Email is turned on, then set:
   - **Email OTP Expiration:** `600` (10 minutes)
   - **Email OTP Length:** `6`

7. Go to **Authentication → Emails → Templates**. Change both the **Magic Link** and the **Confirm signup** templates to the following, so students get a code instead of a link:
   - **Subject:** `Your OMNI code`
   - **Body:**
     ```html
     <h2>Your OMNI sign-in code</h2>
     <p>Type this code in OMNI: <b style="font-size:22px;letter-spacing:3px">{{ .Token }}</b></p>
     <p>It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p>
     ```

8. Go to **Authentication → URL Configuration**. Set **Site URL** to `https://reikenz7-coding.github.io/OMNI-UNNC/`.

---

## Part 3. Set up the email sender (5 to 10 minutes)

Supabase's own email sender is only for testing: it won't send to students. So we give it a Gmail account to send from.

1. Create a **new** Gmail account just for OMNI, for example `omni.unnc.app@gmail.com`. Using a separate account keeps your personal email private.
2. In that account, turn on **2-Step Verification**: myaccount.google.com → Security.
3. Go to **myaccount.google.com/apppasswords**. Create an app password called "OMNI Supabase", and copy the 16-letter password.
4. In Supabase, go to **Authentication → Emails → SMTP Settings** and turn on **custom SMTP**. Fill in:

   | Field | Value |
   |---|---|
   | Sender email | your new Gmail address |
   | Sender name | `OMNI` |
   | Host | `smtp.gmail.com` |
   | Port | `465` |
   | Username | your new Gmail address |
   | Password | the 16-letter app password |

   Then press **Save**.
5. Go to **Authentication → Rate Limits** and raise **emails sent per hour** to `100`.

Gmail can send about 500 emails a day, which is plenty for a class project.

---

## Part 4. Connect OMNI to Supabase (2 minutes)

1. In Supabase, open **Project Settings → API Keys** (on older screens it's called **API**).
2. Copy two things:
   - the **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - the **publishable key**, which starts with `sb_publishable_`. On older screens it's the **anon public** key.
3. Send both to Claude in the OMNI chat. They're safe to share, because the safety rules from Part 2 protect the data. Claude then puts them into `js/config.js`.

   If you'd rather do it yourself, edit `js/config.js` on GitHub and paste them between the quotes.

**Never share these three things** with anyone, Claude included:
- the **secret** key (starts with `sb_secret_`, or is called `service_role`)
- the **database password**
- the **Gmail app password**

---

## After it's live

- **Try it:** open the website, sign in with your UNNC email, and check your inbox. The code can take up to a minute to arrive, and it may land in Junk the first time.
- **Make yourself a moderator,** so you can remove any post. After signing in once, run this in the SQL Editor with your own email:
  ```sql
  insert into public.admins (user_id)
  select id from auth.users where email = 'your-id@nottingham.edu.cn'
  on conflict do nothing;
  ```
- **Keep it awake:** a free Supabase project goes to sleep after a week with no visitors. Clicking **Restore** in the Supabase dashboard wakes it up.
- **Speed in China:** GitHub Pages and Supabase are hosted outside mainland China. They usually work on campus but can sometimes be slow. A later version can move to a China host such as Tencent CloudBase, which is also what WeChat mini programs use.
