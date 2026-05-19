# 🏗️ Pin Sniper: System Architecture & Developer Guide

Welcome to the Pin Sniper codebase! If you are looking to fork, modify, or understand how the system works under the hood, this document breaks down the entire application architecture.

At its core, Pin Sniper is a **hybrid system**. It consists of a local desktop engine (Electron) and a remote trigger (Browser Extensions), which communicate via a secure localhost bridge.

---

## 🗺️ High-Level System Diagram

```mermaid
sequenceDiagram
    participant User
    participant DOM as Active Browser Tab
    participant Ext as Extension Background
    participant API as Local Server (:31337)
    participant Electron as Electron Main Engine
    
    User->>DOM: Opens extension & clicks Start
    DOM->>DOM: Injects scraper.js & extracts media URLs
    DOM->>Ext: Passes JSON payload
    Ext->>API: POST [http://127.0.0.1:31337/snipe](http://127.0.0.1:31337/snipe)
    API->>Electron: Triggers executeSnipe()
    Electron->>Electron: Handles file streams & rate limiting
    DOM->>API: GET /status (Polling every 1s)
    API->>DOM: Returns UI progress updates
