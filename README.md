# 🚀 StartupScore

**AI-powered startup idea evaluator** — Get a brutal, honest score out of 1000 using a hybrid scoring engine.

## How It Works

The app runs a **4-phase hybrid scoring pipeline**:

1. **🔍 Live Market Research** — Web search for real industry data & competitor intel
2. **⚙️ Algorithmic Score** — Deterministic formula-based scoring (keyword analysis, completeness heuristics)
3. **🧠 Dual AI Evaluation** — Two independent Claude Sonnet passes with market context
4. **🔬 Score Blending** — Final score = 20% Algorithm + 40% AI Pass 1 + 40% AI Pass 2

## Deploy to Vercel (5 minutes)

### Step 1: Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or sign in
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-`)

### Step 2: Push to GitHub

```bash
# Clone or download this project, then:
cd startup-score
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/startup-score.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `startup-score` repository
4. **Framework Preset** will auto-detect **Vite** — leave defaults
5. Expand **"Environment Variables"** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your `sk-ant-...` key
6. Click **Deploy**

That's it! Your app will be live at `https://startup-score-xxxx.vercel.app`

### Step 4 (Optional): Custom Domain

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Add your custom domain and follow DNS instructions

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and add your API key
cp .env.example .env.local

# Start dev server
npm run dev
```

> **Note:** For local dev, you'll need the Vercel CLI to run serverless functions:
> ```bash
> npm i -g vercel
> vercel dev
> ```

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Vercel Serverless Functions (Node.js)
- **AI:** Claude Sonnet 4 via Anthropic API
- **Styling:** Inline CSS (no dependencies)

## Project Structure

```
startup-score/
├── api/
│   └── claude.js          # Serverless function (proxies Anthropic API)
├── src/
│   ├── App.jsx            # Main application
│   └── main.jsx           # React entry point
├── index.html             # HTML entry + global styles
├── package.json
├── vite.config.js
├── vercel.json            # Vercel routing config
└── .env.example           # Environment variable template
```

## License

MIT
