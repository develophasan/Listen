# Acil Durum - Professional Audio Platform V4

A high-fidelity, real-time audio streaming and surveillance platform built with WebRTC, Python, and React.

## 🚀 Version 4 Features
- **Global Persistence**: Audio player persists across dashboard tabs.
- **Vantablack V4 Design**: Bespoke Vanilla CSS design system (No Tailwind dependency).
- **Responsive UI**: Fully optimized for mobile, tablet, and desktop.
- **Secure Vault**: Cloud-based recording and archive management via Supabase.

## 🛠 Tech Stack
- **Frontend**: React (Vite), Vanilla CSS, Lucide Icons.
- **Backend/Host**: Python, `aiortc`, `pyaudio`.
- **Infrastructure**: Supabase (Auth, Storage, Realtime, DB).

## 📦 Setup Instructions

### 1. Supabase Config
Create a Supabase project and run the `supabase_schema.sql` in the SQL Editor. 
Disable "Email Confirmation" in Auth Settings for easy testing.

### 2. Python Host (Backend)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Create .env with SUPABASE_URL and SUPABASE_KEY
python host.py
```

### 3. React Client (Frontend)
```bash
cd client
npm install
# Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## 🌐 Deployment
- **Frontend**: Host the `client/` folder on Netlify (Build command: `npm run build`, Directory: `dist`).
- **Backend**: Run the `host.py` on a server with microphone access and stable internet.

---
*Developed for professional surveillance and audio monitoring.*
