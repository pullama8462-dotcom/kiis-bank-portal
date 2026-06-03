# Run the site 24/7 (laptop can be off)

The Cloudflare tunnel only works while your PC is on. For a **permanent** URL, deploy to **Render** (free tier).

## One-time setup (~5 minutes)

1. **Create a free [Render](https://render.com) account** (GitHub login is easiest).

2. **Push this project to GitHub** (if not done yet):
   ```powershell
   cd c:\Users\Himam\.gemini\antigravity\scratch\kiis-bank-portal
   git add -A
   git commit -m "Add production Docker + Render blueprint for 24/7 hosting"
   gh repo create kiis-bank-portal --public --source=. --remote=origin --push
   ```
   If the repo name is taken, pick another name in the `gh repo create` command.

3. **Deploy on Render**
   - Open [Render Blueprints](https://dashboard.render.com/blueprints)
   - **New Blueprint Instance** → connect your GitHub repo
   - Render reads `render.yaml` and creates:
     - PostgreSQL database (`kiis-db`)
     - Web service (`kiis-bank-portal`) from `Dockerfile`
   - Wait for the first deploy (about 5–10 minutes on free tier).

4. **Open your live URL**  
   It looks like: `https://kiis-bank-portal.onrender.com`  
   (exact name is shown in the Render dashboard.)

## Notes

- **Free tier:** The app may sleep after ~15 minutes with no visitors; the first visit after sleep can take ~30 seconds to wake up. It still runs without your laptop.
- **Secrets:** Never commit `.env`. Render sets `DATABASE_URL` and `SECRET_KEY` from the blueprint.
- **Demo logins:** Created on first deploy by `seed.py` (see `backend/seed.py`).

## After deploy

You can stop local `uvicorn` and `cloudflared` — the public site is on Render only.
