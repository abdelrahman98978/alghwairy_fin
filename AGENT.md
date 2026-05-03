# Sovereign Ledger Agent Instructions

You are working on the **Alghwairy Sovereign Finance** project, a specialized fiscal system for customs clearance and logistics.

## Key Principles
- **Aesthetics First**: The interface must remain "Premium" and "Elite" using the Sovereign design system (Gold/Navy/Glassmorphism).
- **ZATCA Compliance**: The system handles tax invoices and QR codes according to ZATCA (Saudi Tax Authority) standards.
- **Data Integrity**: Uses `localDB` for offline-first capabilities with Supabase sync.

## Iconography
- The project is in the middle of a transition from **Lucide React** to **Material Symbols Outlined**.
- **Rule**: If an icon is already a Material Symbol (`material-symbols-outlined`), keep it. If it is a Lucide component, ensure it is correctly imported.
- Do not force migration unless explicitly asked by the user.

## Component Structure
- `AccountingView.tsx` is the core engine.
- `lib/localDB.ts` handles all data persistence.
- `lib/zatca.ts` handles tax logic.
