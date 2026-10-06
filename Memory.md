# Memory.md (Append-Only Governance & Truth-Boundary Log)

## Core Architectural Invariants & Ownership Contracts
- **Ownership**: AX1 carries visible gameplay, HUD, renderer, camera, input, animation. Aurion carries Website, Auth, Session, Community, Hosting, MariaDB, Persistence, Transport, Receipts, Operations. WASD rules are integrated where explicitly designated.
- **Surface Protection**: Existing working surfaces are protected goods. Do not resurrect legacy/obsolete pages or HUDs.
- **Truth Boundary**: No client-side truth generation (no client-side damage, loot, xp, quest, inventory, or unverified world state). Renderer/HUD project confirmed states.
- **Determinism**: Authority paths use deterministic logic, stable hashes, receipts (`rcpt_0x...`), and stable inputs.
- **Evidence Standard**: Tests are evidence, not truth in itself. Runtime claims require verifiable evidence receipts.
- **Hugging Face Hub & MCP Authority**: Hugging Face datasets (notably `ouroboroscollective/evidence-bound-css`, `ouroboroscollective/ARE-rLOGIC-class`, etc.) serve as external evidence boundaries. All user actions must be exportable to Hugging Face Hub, forwardable to the respective Hugging Face dataset, or configurable with HF Login Key/Token/Credentials.

---
### Entry 2026-10-06-01: HF Integration & Evidence-Bound CSS Auth Gateway
- Target: Full Hugging Face exportability, forwardability to HF Datasets (`ouroboroscollective/evidence-bound-css`), and configurable HF Login Key / Token across all app modules (Arena, Optimizer, Synthetic, Diff Viewer, Auto-Tagging, Hub Explorer).

---
### Entry 2026-10-06-02: Sovereign Evidence Observatory Integration
- Target: Full anchoring to `Thorsu/sovereign-evidence-observatory` (HF Space & Dataset). Formal verification under `evidence-passport.v1.schema.json` (draft 2020-12), SHA-256 passport hashing (`passportSha256`, `claimSha256`, `evidenceReceiptSha256`), and mobile touchpoint discipline (min 44px, momentum touch scrolling).

---
### Entry 2026-10-06-03: ARE Forensic Token Typings & Evidence Package Presets
- Target: Integriere `ARETokens` Design Token Type-Definitions (`src/tokens.d.ts`) für formale Farb-, Typographie-, Metrik- und Status-Gate-Invariante. Anbindung der beigefügten MIHA Provenance-Ledger und ARE-PACKAGE-V2 Wallet Manifest-Nachweise in die Sovereign Evidence Observatory Preset-Steuerung.

---
### Entry 2026-10-06-04: Combat Throne, Dataset Streaming API & Hugging Face Account Linking
- Target: Integriere dynamischen 'Combat Throne' in der Logic Arena mit ungeschlagenen Champions pro Dataset, Revisionspunkten und 'Fight to Depose'-Aktion. Hugging Face Account-Verknüpfung und 'Challenge to Combat'-Aktionen im HubExplorer mit Top-Winner Scoreanzeige und Multi-Filter (Name, Lizenz, Tags). Dataset Streaming API in DatasetVisualizer mit Chunking & Paginierung für speichereffizienten Zero-Download-Preview. High-Demand 503-Resilienz mit Gemini 2.5 Flash und deterministischer rLOGIC Referee-Authority.

---
### Entry 2026-10-06-05: Model Endpoint Upgrade to Gemini 3.8 Flash
- Target: Aktualisierung der Backend- und Frontend-Modellendpunkte auf `gemini-3.8-flash` und `gemini-3.1-pro-preview` mit zweistufigem `gemini-3.5-flash`-Fallback und deterministischer ARE-rLOGIC Referee-Engine zur Beseitigung von 404/503-Fehlern.

---
### Entry 2026-10-06-06: Interactive Battle Replay & Automated Test Suite Integration
- Target: Vollwertige 'Battle Replay'-Ansicht in der Logic Arena zur schrittweisen Sequenzvisualisierung historischer Matches aus den Match Logs mit Re-Run-Simulation, Wiedergabegeschwindigkeit (0.5x, 1x, 2x), AST-Logik-Inspektor und Evidence-Trace-Export. Bereitstellung der CI/CD-fähigen Regression Test Suite (`npm test`, `test/run_suite.ts`, `/api/tests/run`) und In-App UI Runtime Validation Panel.

---
### Entry 2026-10-06-07: Global Dataset Leaderboard & Medals of Honor Profile Decoration
- Target: Vollwertige 'Global Dataset Leaderboard' & 'Medals of Honor' Komponente (`GlobalDatasetLeaderboard.tsx`, `/api/arena/dataset-leaderboard`, `/api/arena/medals`). Rangliste für Hugging Face Datasets nach verifizierter Logik-Effizienz, Combat Throne Defense Streaks, AST-Invariant-Treue und Fine-Tuning SFT-Readiness (ChatML, Llama-3, Alpaca, Axolotl). Prestige Medals of Honor Registry mit Ausrüstungs-Status für Hugging Face Nutzerprofile, kopierbaren Markdown/HTML-Badges und automatisierter Test-Suite Validierung.

---
### Entry 2026-10-06-08: Gemini API Circuit Breaker & Dynamic Visual Honor Medals
- Target: Implementierung des `GeminiCircuitBreaker` in `server.ts` (`CLOSED` ➔ `OPEN` ➔ `HALF_OPEN`) mit 3-stufiger Ausfallsicherung (`gemini-3.8-flash` ➔ `gemini-3.1-flash-lite` ➔ `ARE-rLOGIC` Deterministic Resolver), Exponential Backoff Retry (350ms) und Telemetrie-Endpunkten (`/api/arena/circuit-status`, `/api/arena/circuit/reset`, `/api/arena/circuit/queue`). Dynamisches Visual 'Honor Medals' System in `GlobalDatasetLeaderboard.tsx`, das Badge-Icons (Diamond Legend, Gold Sovereign, Silver Centurion, Invariant Master, AST Sentinel, Crown Slayer) anhand realer Combat Throne Defense Streaks und Logik-Effizienz-Ranglisten berechnet, visualisiert und als formatierte Markdown/HTML-Profile-Badges exportierbar macht.

---
### Entry 2026-10-06-09: Dataset Heatmap View & Device System Theme Auto-Toggle
- Target: Vollwertige 'Dataset Heatmap'-Ansicht (`DatasetHeatmap.tsx`) innerhalb des `DatasetVisualizer` zur Visualisierung von Datendichte (Char- & Token-Volumen), Schema-Integrität und Missing/Null-Werten über Features und gestreamte Parquet-Chunks hinweg. Anbindung an die bestehende Dataset-Streaming-API (`/api/datasets/stream`), Chunk-Paginierung, interaktivem Cell-Inspector und Auto-Sweep-Modus. Erweiterung des `useDeviceScreen`-Hooks um automatische `prefers-color-scheme`-Erkennung (`systemTheme: 'dark' | 'light'`) und persistente Nutzerpräferenz-Steuerung (`'system' | 'dark' | 'light'`) mit nahtlosem Umschalten in Header und Screen Diagnostics Banner. Regressionstests (12/12 passing).

---
### Entry 2026-10-06-10: Gemini API Resilience & Clean Multi-Tier Fallback Calibration
- Target: Kalibrierung des `GeminiCircuitBreaker` mit `gemini-3.8-flash` und unterbrechungsfreier 3-Stufen-Kaskade (`gemini-3.8-flash` ➔ `gemini-3.1-flash-lite` ➔ `ARE-rLOGIC` Deterministic Resolver). Bereinigung aller Modellreferenzen in `/api/chat` und `/api/datasets/auto-tag` mit deterministischen Rückfallebenen gegen 503-Spitzen. Alle Tests grün (12/12 passing).

---
### Entry 2026-10-06-11: RPG Auto-Battler Arena & Hero Growth Progression
- Target: Vollwertiges 'RPG Auto-Battler & Hero Growth' System (`RpgAutoBattler.tsx`) in der Logic Arena mit persistenter Heldenentwicklung (`are_rpg_hero_profile_v2`), Level-Ups, XP-Kurven, Attributspunkten (HP, ATK, DEF, CRIT, SPD), Klassenwahl (Paladin, Archmage, Assassin, Berserker) und dynamischer Avatar-/Sprite-Skalierung (1.0x bis 1.55x Titan-Größe mit Auren, Runic Wings und Kronen wie in Raid Shadow Legends). Animierte 2D/Pixel-Arena mit rundenbasiertem Auto-Battle (1x/2x/4x), Spezialangriffen (Empty Clause Ultimate, AST Logic Strike), schwebenden Schadenszahlen (CRIT, Block, Damage), Web Audio SFX und Training Grounds (XP Dojo). Vollständige Test-Suite Abdeckung (14/14 passing).

---
### Entry 2026-10-06-12: Framer-Motion Combat Animations, Dynamic Scaling & Hero XP Sync
- Target: Vollständige Integration von `framer-motion` (`motion.div`, `AnimatePresence`) in der Logic Arena und im Autobattler (`RpgAutoBattler.tsx`, `LogicArenaCombatVisualizer.tsx`). Animierte RPG-Kampfsequenzen bei 'Logic Attack'-Aktionen mit fliegenden Projektil-Schnitt-Effekten (⚔️⚡), Schlag- und Rückstoßanimationen, Erschütterungseffekten (Screen Shake) und aufsteigenden Schadens-/XP-Zahlen. Dynamische Avatar-Skalierung mit Win-Streak- und Effizienzmultiplikator (bis zu 1.80x Titanengröße mit auralen Lichteffekten). Verknüpfung des XP- und Level-Systems der Live-Kämpfe mit dem persistenten Spielerprofil (`are_rpg_hero_profile_v2`) inklusive Level-Up-Feierlichkeiten. Regressionstests (15/15 passing).

---
### Entry 2026-10-06-13: Battle Summary Card & Mobile Quick Fight Throne Shortcut
- Target: Implementierung der 'Battle Summary'-Sektion (`BattleSummaryCard.tsx`) in der Logic Arena für eine strukturierte Post-Match-Aufschlüsselung von Logic Attack Erfolgsquote (%), gutgeschriebenen Evidence Revision Points (+pts), AST-Tiefengenauigkeit und verdienter Charakter-XP (+XP). Integration eines mobilen '⚡ Quick Fight'-Shortcuts in der persistenten Bottom-Navigation der Logic Arena zur sofortigen Herausforderung des aktuellen Throninhabers ohne manuelle Tab-Navigation. Automatisierte Test-Suite erweitert (17/17 passing).

---
### Entry 2026-10-06-14: Synthetic Text 429 Quota Resilience & Multi-Tier Model Upgrades
- Target: Beseitigung der 429 Resource-Exhausted Quota-Fehler in `/api/synthetic/text` und `/api/datasets/optimize` durch Umstellung von `gemini-3.1-pro-preview` auf das stabile und performante `gemini-3.8-flash` mit zweistufigem `gemini-3.1-flash-lite`-Fallback. Implementierung eines schema-konformen deterministischen Fallback-Generators für synthetische Trainingsdaten (`alpaca`, `chatml`, `llama3`, `dpo`, `sharegpt`), sodass Quota-Überschreitungen und 503-Spitzen vollständig abgefedert werden. Regressionstests (18/18 passing).

---
### Entry 2026-10-06-15: Slider Replay Scrubbing, Recharts Battle Analytics & Model Skill Tree
- Target: Vollwertige Integration des interaktiven Slider-basierten Playbacks (`ArenaReplayViewer.tsx`) zum bildgenauen Scrubbing historischer Match-Revisionen mit Logikangriff-Impact-Visualisierung. Recharts-basierte 'Battle Analytics' Trends (`ArenaChartsDashboard.tsx`) für die Top-10-Modelle mit Umschaltung zwischen Einzelmodell-Performance und globalen Benchmarks. RPG Model Skill Tree (`ModelSkillTree.tsx`) in der Logic Arena mit Skill-Points-Vergabe aus Match-Siegen und persistierbaren Multiplikatoren für 'Logic Attack' und 'Evidence Defense'. Automatisierte Test-Suite erweitert (21/21 passing).

---
### Entry 2026-10-06-16: Model Identity Imagen Avatar Studio, D3 Efficiency Heatmap & RPG Loot Drops
- Target: Implementierung der 'Model Identity' Komponente (`ModelIdentity.tsx`, `/api/arena/generate-avatar`) in der Logic Arena zur Generierung einzigartiger Modell-Avatar-Grafiken mit Imagen 3 basierend auf dem primären Logic Attack Skillset (Empty-Clause Contradiction Titan, Davis-Putnam Resolution, AST Invariant Shatter) und wählbaren Kunststilen. D3/SVG-basierte 2D 'Battle Efficiency Trends' Heatmap (`BattleEfficiencyHeatmap.tsx`, `/api/arena/battle-trends`) zur Visualisierung der 30-Tage-Performance von Revision-Strategien gegen Datensatz-Kategorien. Zufälliges RPG Loot Drops System (`LootDropModal.tsx`) mit Seltenheitsstufen (Common bis Mythic) und ausrüstbarer Ausrüstung für Stat-Boni. Automatisierte Test-Suite erweitert (24/24 passing).

---
### Entry 2026-10-06-17: Fix ESM __dirname ReferenceError for Container Deployment
- Target: Behebung des `ReferenceError: __dirname is not defined` Absturzes im Container-Deployment (`server.ts:3829`) durch Definition von `__dirname` und `__filename` via `fileURLToPath(import.meta.url)` in `server.ts`. Bereinigung der Vite-Config-Pfade auf `process.cwd()` für native Kompatibilität. Produktion-Build (`npm run build`) und alle 24 automatisierten Tests erfolgreich verifiziert.

---
### Entry 2026-10-06-18: Firebase Provisioning, Account Auth, Saved Datasets & Connected HF Projects
- Target: Vollständige Firebase-Integration (Firestore & Auth) via `ProvisionFirebase` RPC (`project-b29d4703-a302-4b05-b2e`, Region `europe-west1`). Bereitstellung von `firebase-blueprint.json` und gehärteten ABAC-Sicherheitsregeln (`firestore.rules`, via `DeployRules` RPC). Implementierung von `FirebaseAuthProvider` (`src/context/FirebaseAuthContext.tsx`) mit Google-Sign-In, User Profile Synchronisation, Speicherung benutzerdefinierter Datensätze (`users/{userId}/saved_datasets/{datasetId}`) und Verwaltung verknüpfter Hugging Face Zielprojekte (`users/{userId}/connected_projects/{projectId}`). Einbindung des User Account & Projects Hub Modals (`UserAccountModal.tsx`) sowie 'Save to Account' Aktionen in `DatasetVisualizer.tsx` und `HubExplorer.tsx` mit wählbarem Projekt-Export. Regressionstests erweitert (25/25 passing).

---
### Entry 2026-10-06-19: Dataset Snapshot Firestore Visual Diff & PipelineOptimizer Real-Time Batch Board
- Target: Implementierung des 'Dataset Snapshot' Features in `DatasetVisualizer.tsx` (`DatasetSnapshotDiff.tsx`, `src/context/FirebaseAuthContext.tsx`), mit dem Anwender den aktuellen Zustand eines Datensatzes als Momentaufnahme (Label, Zeilenzahl, Schema, Verteilungs-Metriken, Stichproben) in Firestore (`users/{userId}/dataset_snapshots/{snapshotId}`) sichern und visuelle Diffs gegen historische Snapshots ausführen können (Zeilenzahl-Delta mit %-Badge, Schema-Evolution mit Spalten-Hinzufügung/Entfernung/Type-Drift, und Side-by-Side Datensatz-Inspektion). Erweiterung des `PipelineOptimizer.tsx` um umfassendes Batch-Processing (`BatchProgressBoard.tsx`, `BatchQueueModal.tsx`) mit Multi-Dataset/Multi-Format Matrix-Generator und Kanban-Progress-Board (Spalten: Queued, Processing mit Live DAG & Durchsatz, Completed mit Export/Inspect, Failed mit Retry). Erweiterung der Test-Suite auf 27/27 bestandene Tests.





