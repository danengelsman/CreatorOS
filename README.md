# CreatorOS

**CreatorOS** (also featuring internal tools like the *Vertano Scene Planner* & *Retention Lab*) is the ultimate operating system for modern content creators. It provides an end-to-end suite of tools designed to help you go from zero subscribers to your first dollar by streamlining branding, ideation, content creation, audience retention, and monetization.

## 🚀 Features

CreatorOS acts as a complete full-stack environment tailored for YouTube, TikTok, and cross-platform creators.

### 🎬 Studio & Content Creation
- **Content Studio & Editor:** A rich text editor integrated with AI-powered quick polish, script formatting, and voiceover generation.
- **Scene Planner:** Segments your scripts into timed visual beats, assigns camera shot lists, estimates video lengths, and generates Plan A (Stock Query) and Plan B (AI Image Prompt) visual ideas.
- **Retention Lab:** An algorithmic First 5s Optimizer that diagnoses retention risks for your video hooks, offering second-by-second attention heatmaps and high-converting viral hook rewrites.
- **Video Studio:** Generates AI-driven imagery, applies panning effects, synchronizes text-to-speech narration, and provides playback controls for a fully functional video prototype.
- **Content Repurposer:** Automatically adapts existing content (e.g., YouTube scripts) into Twitter threads, LinkedIn posts, or blog articles with context-aware Gemini AI.

### 🎨 Brand & Ideation
- **Branding Engine:** Generates brand guidelines, custom color palettes, brand voice parameters, and logos tailored to your specific niche.
- **Video Ideas Pipeline:** Suggests high-performing video concepts based on your audience, niche, and trends, giving you a continuous pipeline of ideas.
- **Perfect Prompt Co-Pilot:** An AI prompt builder to help you communicate effectively with AI tools for maximum creative output.

### 📈 Growth & Analytics
- **First Dollar Dashboard:** Tracks your monetization journey, giving actionable product and strategy recommendations scaled to your current follower count (0-1K, 1K-10K, etc.).
- **Dashboard & Reports:** A unified view of your projects, analytics (YouTube/TikTok sync), and overall content performance.
- **Roadmap:** A visualized path from starting out to hitting major revenue milestones, keeping you focused on the right growth levers.
- **Creator Hub & Community:** Connect, chat, and view leaderboards of fellow creators scaling their channels.

### ⚙️ System & Settings
- **Profile Management:** Set up your creator profile, link platform accounts, and manage subscriptions.
- **Help Center & Support Hub:** Built-in guidance, tutorials, and developer/support access for account troubleshooting.
- **Firebase Integration:** Secure authentication, real-time Firestore database sync, and robust session management.

## 🛠️ Tech Stack

- **Frontend Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Phosphor Icons
- **Animations:** Motion (framer-motion)
- **Backend/API:** Node.js + Express (serving as an API proxy for Gemini services and internal routing)
- **Database & Auth:** Firebase (Firestore & Authentication)
- **AI Integration:** Google GenAI SDK (Gemini 2.5 Flash / Pro) for text, image, and data generation tasks.

## 🔧 Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file based on `.env.example` and add your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   # Firebase configuration variables
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`.

4. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

## 🧠 AI Capabilities

CreatorOS leverages the **Gemini 2.5 Flash** model for highly responsive generative tasks:
- **Text & Script Generation:** Writing, polishing, and adapting video scripts.
- **Structural Analysis:** The *Retention Lab* and *Scene Planner* parse complex creative text and output strict JSON structures for visual beat mapping and retention scoring.
- **Asset Generation:** Generates voiceovers (TTS) and dynamic images for video mockups.

## 📄 License

Proprietary software. All rights reserved.
