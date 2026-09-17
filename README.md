# 🐍 Snake Arena (Multi-Snake)

A modern, high-performance real-time multiplayer snake game built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **WebRTC (PeerJS)**. Features custom room lobbies, customizable session lengths, dynamic session-closing warning announcements, power-ups, tactile non-neon aesthetics, and smart AI bots.

![Snake Arena Preview](https://raw.githubusercontent.com/pujanjoci/Multi-Snake/main/public/preview.png)

---

## ✨ Features

- **🎮 Real-Time Multiplayer**: Instant peer-to-peer multiplayer using WebRTC with automatic local `BroadcastChannel` fallback.
- **🏠 Custom Room Lobbies**: Create or join rooms with 4-letter room codes or direct invite links (`?room=CODE`).
- **🎨 8 Snake Skins**: Tailored snake skins with expressive directional eyes and smooth gradients (Emerald Viper, Obsidian Shadow, Ruby Cobra, Sapphire Python, etc.).
- **⏱️ Long Sessions & Dynamic Alerts**:
  - Customizable session timers (3m, 5m, 10m, 15m).
  - Multi-tiered ending notifications (2m warning, 1m rush broadcast, 30s emergency alert, and 10s countdown ticks).
  - Desktop Web Notification API support.
- **⚡ Power-Ups & Sprint**:
  - **Boost**: Hold <kbd>SPACE</kbd> or <kbd>SHIFT</kbd> for a burst of speed.
  - **Speed Boost (⚡)**, **Ghost Phase (👻)**, **Magnet (🧲)**, **Golden Orbs (⭐)**, and **Shrink Gem (✂️)**.
- **🤖 Smart AI Bots**: Adaptive bots with collision lookahead and food pathfinding to fill empty lobby slots.
- **🔊 Procedural Audio**: Built-in Web Audio API sound synthesizer for tactile pop effects, sirens, chimes, and victory fanfare (no external audio assets required).
- **🏆 Live HUD & Match Podium**: Live leaderboard, mini-map, quick reaction emote wheel, and end-of-match awards.

---

## 🕹️ Controls

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Move Up** | <kbd>W</kbd> or <kbd>↑</kbd> | On-screen D-Pad Up |
| **Move Down** | <kbd>S</kbd> or <kbd>↓</kbd> | On-screen D-Pad Down |
| **Move Left** | <kbd>A</kbd> or <kbd>←</kbd> | On-screen D-Pad Left |
| **Move Right** | <kbd>D</kbd> or <kbd>→</kbd> | On-screen D-Pad Right |
| **Sprint / Boost** | <kbd>Space</kbd> or <kbd>Shift</kbd> | Touch Boost Button |
| **Reaction Emotes** | Bottom Emote Bar / Number Keys | Bottom Emote Bar |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed

### Installation

```bash
# Clone the repository
git clone https://github.com/pujanjoci/Multi-Snake.git

# Navigate to project directory
cd Multi-Snake

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (Turbopack) & React 19
- **Networking**: WebRTC (PeerJS) & BroadcastChannel API
- **Rendering**: HTML5 Canvas (60+ FPS)
- **Styling**: Tailwind CSS & Modern Slate Glassmorphism
- **Audio**: Web Audio API (Synthesized procedural SFX)
- **Effects**: canvas-confetti, Lucide Icons

---

## 📄 License

MIT License. Feel free to use, modify, and build upon this game!
