# Apex HMS — Clinical Ergonomics & Print Rules

## 1. Enter-as-Tab Industrial Keyboard Navigation

In busy hospital reception counters and OPD triage rooms, switching between keyboard and mouse introduces severe fatigue and halves patient processing speed.

Apex HMS introduces the **Enter-as-Tab** utility (`utils/form-navigation.ts`):
- Pressing **`Enter`** on any form input automatically advances focus to the next logical interactive field.
- The input text in the newly focused element is automatically selected for rapid overwrite.
- Multi-line textareas preserve newline entry unless explicitly overridden with `data-enter-next="true"`.
- Hidden or disabled elements (`display: none`, `tabindex="-1"`, `disabled`) are automatically bypassed.
- Reaching the final field or submit button executes form submission.

---

## 2. Global Command Palette (`Ctrl+K`)

Doctors and staff can press **`Ctrl+K`** (or `Cmd+K` on macOS) from anywhere in the application to open the unified search spotlight:
- Instant jump to any of the 12 clinical modules.
- Search patients by UHID, Mobile Number, or Full Name.
- Look up doctors by department or specialization.

---

## 3. In-Memory ICD-10 Diagnostic Search

Searching external API endpoints for diagnosis codes during live patient consultation introduces unpredictable latency.
Apex HMS includes a pre-indexed in-memory dictionary of frequently diagnosed conditions in Indian clinical practice (`utils/icd10.ts`):
- Zero network round-trips.
- Autocompletes within 1ms.
- Pre-maps codes to official WHO ICD-10 classifications and categories.

---

## 4. Shorthand Clinical Dose Frequency Parser (`1-0-1 5d`)

Doctors write medical prescriptions at maximum velocity using shorthand medical notations. Apex HMS provides an instant deterministic parser (`utils/dose-parser.ts`):
- `1-0-1 5d`: Morning: 1, Afternoon: 0, Night: 1 for 5 days -> auto-calculates 10 tablets.
- `1-1-1 3d`: Morning: 1, Afternoon: 1, Night: 1 for 3 days -> auto-calculates 9 tablets.
- `1-0-0 30d`: Once daily in morning for 30 days -> auto-calculates 30 tablets.
- `0-0-1 10d`: Once daily at bedtime for 10 days -> auto-calculates 10 tablets.
- Standard medical acronyms: `TDS 5d` (15 tabs), `BD 7d` (14 tabs), `OD 10d` (10 tabs), `QID 3d` (12 tabs), `SOS` (as needed).
- Automatically calculates total dispensation quantity and populates the instructions field.

---

## 5. 1-Click Clinical Regimen Cloner

Common acute and chronic disease protocols can be cloned with a single click in `/opd`:
- **Essential HTN Regimen**: Telmisartan 40mg + Amlodipine 5mg
- **Type 2 Diabetes Regimen**: Metformin 500mg SR + Glimepiride 1mg
- **Acute URTI / Viral Regimen**: Paracetamol 500mg + Amoxicillin 500mg + Cetirizine 10mg
- **GERD / Gastritis Regimen**: Pantoprazole 40mg + Sucralfate Syrup

---

## 6. Web Audio API High-Fidelity Queue Chime

Waiting room TV displays (`/token-board`) require pleasant, audible acoustic feedback when a patient's token is called.
Apex HMS features a native Web Audio API synthesizer (`utils/audio-chime.ts`):
- Generates a 2-tone melodic clinic chime (880Hz A5 bell followed by 587.33Hz D5 decay).
- Zero external MP3/WAV file downloads; works 100% offline.
- Browser audio context auto-resumption on user interaction.
- Independent mute and test chime controls.

---

## 7. `@media print` Layout Unconstraining

Web application dashboards typically utilize `h-screen overflow-hidden` layouts with fixed sidebars. Attempting to print documents from such shells results in clipped pages and cut-off tables.

Apex HMS enforces strict print CSS rules in `app/globals.css`:
```css
@media print {
  /* Suppress UI controls, sidebar, topbar, and notifications */
  aside, header, nav, .no-print, [data-sonner-toaster] {
    display: none !important;
  }

  /* Unconstrain parent containers to allow multi-page document flow */
  html, body, main, div[class*="overflow-hidden"], div[class*="h-screen"] {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Page margins and A4 letterhead preservation */
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }
}
```
