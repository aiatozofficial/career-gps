# Career GPS Phase Notes

## Phase 2 Carryover

- Split `What's your dream direction?` into a goal-type step and a dynamic follow-up step.
- For `Job role`, ask for the role; if the student is unsure, suggest a role from field and skills.
- For `Startup`, ask what kind of startup; if unsure, suggest startup directions from field and skills.
- For `Higher studies`, ask target course or domain; if unsure, suggest options from field and skills.
- For `Not sure yet`, generate an exploratory job-oriented roadmap from field and skills.
- Update mock roadmap rendering so it reflects the selected goal detail instead of always showing one generic data analyst preview.

## Phase 4 API Key Security

- Do not ship a real OpenAI key through `VITE_OPENAI_API_KEY`; Vite exposes frontend env vars in the browser bundle.
- Use a small serverless proxy for real OpenAI generation.
- Store the OpenAI key only in the serverless environment.
- Keep frontend Zod validation and graceful fallback before rendering roadmap JSON.

## Phase 3 Carryover From Review

- Replace the Phase 2 decision-tree preview with a fully interactive D3 tree.
- Preserve the React/D3 boundary: React renders only the empty SVG ref; D3 owns all nodes, links, transitions, zoom, and click behavior.
- Make tree nodes expandable/collapsible and open a detail popover for milestone, course, certification, and internship context.
- Connect milestone completion between the tree, goal checklist, and progress tracker.
- Expand alternate-path clicks into full alternate roadmap generation once real progress state and/or AI data are available.
