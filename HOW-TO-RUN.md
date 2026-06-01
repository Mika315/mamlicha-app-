# 🚀 HOW TO RUN — ממליצה לך בגדול (Mamlicha)

A step-by-step guide to get the project running on your computer.

---

## STEP 1 — Install Node.js

If Node.js is not already installed:

1. Go to https://nodejs.org
2. Download the **LTS** version (green button)
3. Run the installer and follow the prompts
4. Verify it worked — open Terminal (or Command Prompt) and type:

```
node -v
npm -v
```

Both commands should print a version number (e.g. `v20.x.x`).

---

## STEP 2 — Get your API Keys

You need accounts and API keys from 3 services. All have free tiers.

### A. MongoDB Atlas (Database)

1. Go to https://www.mongodb.com/cloud/atlas and create a free account
2. Create a **free cluster** (M0 tier — free forever)
3. In "Database Access" → add a user with username + password
4. In "Network Access" → click "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Connect" → "Drivers" → copy the connection string
   - It looks like: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with your password and add `mamlicha` as the database name:
   - Final: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/mamlicha?retryWrites=true&w=majority`
6. **For the AI chatbot (RAG):** In Atlas, go to your cluster → "Atlas Search" → Create a Vector Search Index:
   - Collection: `mamlicha.recommendations`
   - Index name: `vector_index`
   - Field: `embedding` (type: `knnVector`, dimensions: `768`, similarity: `cosine`)

### B. Google Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### C. Cloudinary (Image Storage)

1. Go to https://cloudinary.com and create a free account
2. On the dashboard you'll see your:
   - Cloud Name
   - API Key
   - API Secret
3. Copy all three values

---

## STEP 3 — Set Up the Project

Open Terminal (or Command Prompt on Windows) and run:

```bash
# Navigate to the project folder
cd "path\to\mamlicha"

# For example:
cd "C:\dev\mamlicha+AInbot\Mamlicha +AI bot\mamlicha"
```

Install all dependencies:

```bash
npm install
```

This will download everything needed (express, mongoose, langchain, etc.).
It may take 1–2 minutes.

---

## STEP 4 — Create the .env File

In the `mamlicha` folder, create a new file called `.env` (no extension, just `.env`).

Copy and paste this into it, replacing the placeholder values with your real keys:

```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/mamlicha?retryWrites=true&w=majority
GEMINI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXX
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_USER=contact.mamlicha@gmail.com
EMAIL_PASS=your_gmail_app_password
PORT=3000
```

> **Important:** Never share this file or upload it to GitHub. It contains your secret keys.

---

## STEP 5 — Start the Server

In the terminal (inside the `mamlicha` folder):

```bash
node server/index.js
```

You should see:
```
✅ Connected to MongoDB Atlas
🚀 Server running on http://localhost:3000
```

Open your browser and go to: **http://localhost:3000**

The site is now running! 🎉

---

## STEP 6 — Development Mode (Auto-Restart)

Instead of stopping and restarting the server every time you change a file:

```bash
npm run dev
```

This uses `nodemon` which automatically restarts whenever you save a file.

---

## Project Structure

```
mamlicha/
├── client/                   ← Everything the browser sees
│   ├── index.html            ← Page 1: Home + Search
│   ├── recommend.html        ← Page 2: Submit recommendation
│   ├── forum.html            ← Page 3: Community forum
│   ├── css/
│   │   └── style.css         ← All styling (RTL, pink theme)
│   └── js/
│       ├── search.js         ← Filter & display recommendations
│       ├── recommend.js      ← Form + face-blur canvas tool
│       ├── forum.js          ← Forum posts & replies
│       └── chatbot.js        ← AI chatbot widget ("רוני")
│
├── server/                   ← The backend (runs on Node.js)
│   ├── index.js              ← Main server entry point
│   ├── routes/
│   │   ├── recommendations.js  ← GET/POST /api/recommendations
│   │   ├── forum.js            ← GET/POST /api/forum + replies
│   │   ├── chat.js             ← POST /api/chat (AI chatbot)
│   │   └── upload.js           ← POST /api/upload (Cloudinary)
│   ├── models/
│   │   ├── Recommendation.js   ← MongoDB schema
│   │   └── ForumPost.js        ← MongoDB schema
│   └── services/
│       ├── gemini.js           ← Gemini API (embeddings + chat)
│       ├── langchain.js        ← RAG vector search pipeline
│       └── cloudinary.js       ← Image upload service
│
├── .env                      ← Your secret keys (DO NOT share!)
├── .env.example              ← Template for .env
├── .gitignore
├── package.json
└── HOW-TO-RUN.md             ← This file
```

---

## API Endpoints

| Method | URL | What it does |
|--------|-----|--------------|
| GET | /api/recommendations | Fetch recommendations (with filters) |
| POST | /api/recommendations | Submit a new recommendation |
| GET | /api/forum | Fetch all forum posts |
| POST | /api/forum | Create a new forum post |
| POST | /api/forum/:id/reply | Reply to a forum post |
| POST | /api/chat | Send message to AI stylist (Gemini + RAG) |
| POST | /api/upload | Upload image to Cloudinary |

---

## Deploying to the Internet (Render.com — Free)

1. Push your code to GitHub (make sure `.env` is in `.gitignore`)
2. Go to https://render.com and create a free account
3. Click "New Web Service" → Connect your GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server/index.js`
5. Under "Environment Variables" — add all the same variables from your `.env` file
6. Click Deploy!

Your site will be live at a public URL like `https://mamlicha.onrender.com`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module 'express'` | Run `npm install` again |
| `MongoDB connection error` | Check your MONGODB_URI in .env. Make sure you allowed IP access in Atlas. |
| `Gemini API error` | Check your GEMINI_API_KEY. Make sure there are no extra spaces. |
| `Port 3000 already in use` | Change `PORT=3001` in .env, or kill the existing process |
| Page loads but no recommendations | The database is empty — add some via the "המליצי" page first |
| Image upload fails | Check your Cloudinary credentials in .env |

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Run server (production mode)
node server/index.js

# Run server (development mode with auto-restart)
npm run dev

# Open site in browser
# Go to: http://localhost:3000
```

---

Built with ❤️ for the Mamlicha community 💕
