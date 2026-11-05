# HL7 Lens
[main page](./hl7-lens-mainpage.png)

A small HL7 v2 message explorer using plain HTML, CSS and JavaScript.
Paste a message, select a segment, then expand a field to see its components.

## Run locally

From this project's folder:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. VS Code's Live Server also works.
JavaScript now uses `import`, so serve the files over HTTP rather than opening
`index.html` by double-clicking it. No build, dependencies or API keys are needed.
For GitHub Pages, publish the contents of `dist/` together.


## Scope

Supports multiple messages, custom delimiters, repeated segments/fields,
components/subcomponents, empty/null fields, basic MLLP framing and standard
delimiter escapes. Raw values are preserved. Files/text are limited to 1 MB.

The simplified UI keeps file import, examples, search, an empty-field toggle,
JSON inspection and download. Decorative sections, output tabs, clipboard copy,
the delimiter badge display and the keyboard shortcut have been removed.

This is a structural explorer, not an HL7 conformance validator or FHIR converter.
Labels are a partial reference and can vary by HL7 version/profile. Batch
FHS/BHS envelopes and wrapped segment lines are unsupported. Unknown escapes
remain literal. Messages stay in memory in your browser; use synthetic demo data.

## Checks

With Node.js 18 or later, run `npm test` (no `npm install` needed).
All 14 parser tests pass. Outputs/errors match the original for 239 representative
inputs. UI logic was checked using a lightweight DOM stub; actual browser rendering
was not verified in the editing environment.
