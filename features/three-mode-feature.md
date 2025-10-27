# Three-Mode Document Lookup

## Overview
Introduce a tabbed lookup experience in the Document Lookup panel so users can choose between three query modes:

1. **By objectId** – Enter or automatically capture an ObjectId from the clipboard. Displays either a single matching document or, when multiple collections match, a JSON object keyed by collection name.
2. **Find** – Compose a `find` filter for a chosen collection and receive results as a JSON array.
3. **Aggregate** – Run an aggregation pipeline against a chosen collection and receive the pipeline output as a JSON array.

All three modes share the same results viewer, which always renders a single valid JSON document.

## Mode Details

### By objectId
- Tab contains the existing ObjectId input plus the clipboard watch toggle.
- Clipboard polling runs only while this tab is active.
- When multiple collections contain a matching ObjectId, the results render as an object whose keys are collection names and values are the corresponding documents.

### Find
- Tab includes a collection dropdown (independent of the sidebar selection), a multiline editor for the find filter, and a per-mode result limit control.
- The **Run** button remains disabled until the filter parses as valid JSON (supporting MongoDB Extended JSON where applicable).
- Executing the query runs a dedicated Node helper script and displays the response as a prettified JSON array, truncated to the configured limit.

### Aggregate
- Tab mirrors the Find tab structure with its own independent collection dropdown, pipeline editor, and result limit input.
- The **Run** button activates only when the pipeline text parses as a valid JSON array.
- Queries execute through their own helper script and display results as a prettified JSON array, capped at the tab-specific limit.

## Shared Behavior
- The results pane is common to all tabs and always renders a single JSON value (object or array) to simplify copying.
- Input parsing errors surface inline, preventing execution until resolved.
- Each mode delegates to its own Node script (`findMongoDocument.js` for ObjectId lookups, new scripts for Find and Aggregate), keeping responsibilities separated.

## Open Considerations
- Decide on default limit values for the Find and Aggregate tabs.
- Determine whether ObjectId matches should stop at the first document server-side or continue aggregating all matches before formatting the combined result.
