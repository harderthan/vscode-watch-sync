# Watch Sync Profiles & Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor configuration to support multiple profiles (aliases) and implement an interactive wizard for profile selection/creation via VSCode Palette.

**Architecture:**
- **Configuration:** Migrate from flat settings to `watchSync.profiles` array in `settings.json`.
- **UI:** Use `vscode.window.showQuickPick` for selection and `showInputBox` for creation wizard.
- **Entry Point:** `watchSync.start` triggers the UI flow instead of immediate start.

**Tech Stack:** TypeScript, VSCode Extension API.

---

### Task 1: Refactor Configuration for Profiles

**Files:**
- Modify: `package.json`
- Modify: `src/configuration.ts`

**Step 1: Update `package.json` Schema**
- Remove flat properties (`watchSync.remoteUser`, etc.).
- Add `watchSync.profiles` array property.
- Each item in array has: `alias`, `remoteUser`, `remoteHost`, `remoteDir`, `localDir`, `sshPort`, `exclude`, `direction`.

**Step 2: Update `ConfigurationManager`**
- Define `Profile` interface.
- Implement `getProfiles(): Profile[]`.
- Implement `addProfile(profile: Profile): Promise<void>`.
- Remove old single-config validation logic.

---

### Task 2: Implement Profile Wizard UI

**Files:**
- Create: `src/wizard.ts`

**Step 1: Define Wizard Class**
- `ProfileWizard` class with `selectOrCreateProfile(): Promise<Profile | undefined>`.

**Step 2: Implement Selection Flow (`QuickPick`)**
- Show existing aliases + "[New Profile]" option.
- Return selected profile if existing chosen.

**Step 3: Implement Creation Flow (`InputBox`)**
- Chain `showInputBox` calls:
    1. Alias Name (must be unique)
    2. Remote Host
    3. Remote User
    4. Remote Dir
    5. Local Dir (Default: workspace root)
    6. SSH Port (Default: 22)
- Validate inputs at each step.

**Step 4: Save & Return**
- Call `ConfigurationManager.addProfile` to save to `settings.json`.
- Return the newly created profile.

---

### Task 3: Update Extension Entry Point

**Files:**
- Modify: `src/extension.ts`

**Step 1: Update `startWatch` Command**
- Replace direct `watcher.start` call with `wizard.selectOrCreateProfile()`.
- If profile returned, start watcher with that profile's config.

**Step 2: Update Status Bar & Logger**
- Display active alias in logs: `Watch Sync started (Alias: dev-server)`.

---

### Task 4: Update Documentation

**Files:**
- Modify: `docs/configuration.md`
- Modify: `docs/synchronization.md`

**Step 1: Reflect Profile Structure**
- Update schema documentation to show array format.
- Update examples.

**Step 2: Document Wizard Usage**
- Explain how to use the Palette to add profiles.

