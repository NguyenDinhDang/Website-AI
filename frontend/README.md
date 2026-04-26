# LearnOS Frontend Application

## Description

LearnOS is an AI-powered learning workspace platform that allows users to seamlessly integrate the capabilities of Google's Gemini LLM into their private study workflows. Users can upload their personal documents (PDFs, Word documents, TXTs, or Markdown configurations), select a context, and directly interface with the AI to generate summaries, solve contextual questions, or dynamically generate quizzes based heavily on the uploaded content rather than raw knowledge parameters.

## Features

- User Authentication & Session Management.
- Multi-format Document Uploading (PDF, TXT, DOCX, Markdown).
- Context-Aware Document Selection.
- Intelligent Auto-Summary Tool.
- Dynamic Multi-choice Quiz Generation from uploaded contexts.
- Specialized Learning Statistics & Tracking.
- Comprehensive Error Boundary implementation for system stability.
- Resilient CSS Design Token interface (Fully responsive across Mobile, Tablet, Desktop).

## Tech Stack

- **Framework**: React (Bootstrapped with Vite)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Modular CSS with standard Design System and Root Component Tokens)
- **Architecture**: Context-driven REST Client integrations

## Project Structure

```text
frontend/
├── src/
│   ├── components/      # Reusable UI configurations and critical boundary systems
│   │   └── ErrorBoundary.tsx
│   ├── pages/           # Central Routing modules
│   │   ├── AuthPage.tsx
│   │   └── WorkspacePage.tsx
│   ├── styles/          # Advanced Style Architecture and Design Tokens
│   │   ├── variables.css
│   │   ├── AuthPage.css
│   │   └── WorkspacePage.css
│   ├── App.css          # Deprecated/Root overrides
│   ├── App.tsx          # Application Root and session initializer
│   ├── index.css        # Global CSS Reset, utility bindings, token injection
│   └── main.tsx         # Virtual DOM attacher
├── package.json         # Dependency configuration file
└── vite.config.ts       # Bundler specifics
```

## Installation

Ensure you have Node.js version 18.x or above installed on your operating system. From the exact frontend directory:

1. Install project dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will initialize nominally at port 5173 on localhost.

## Environment Variables

To operate fully against an active backend stack, a configuration file pointing to the relevant API domains is functionally required if circumventing standard Vite proxy defaults:

1. Create a `.env` file traversing the frontend root directory.
2. Formulate the required backend connections:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Usage

1. Register an account by navigating to the "Create Account" tab on the root landing layout.
2. Fill your detailed specifications safely (Password requires 8 criteria marks minimum).
3. Post-authentication, utilize the file selector block on the left panel.
4. Input specific technical manuals or textbook equivalents as required.
5. Highlight an imported document via the sidebar selector to activate context locks.
6. Submit textual queries natively addressing the context within the main chat layout.
7. Exploit the auxiliary side panel function modules to isolate summaries or compile test protocols.

## API Integration

All external interfaces channel through the REST schema configured under `/api/v1`. Critical routes in operational duty:

- `POST /auth/login` - Resolves JWT (AccessToken, RefreshToken).
- `POST /auth/register` - Establishes credentials inside the backend schema.
- `GET /auth/me` - Verifies session integrity against headers.
- `GET | POST | DELETE /documents/` - Manages user document entities.
- `POST /ai/chat` - Submits contextual LLM queries.
- `POST /ai/summarize` - Commands raw textual derivations.
- `POST /ai/generate-quiz` - Interprets structure from textual references to output multiple choice testing variants.

## Development Workflow

Contributions must strictly follow the standard internal conventions established for cross-collaboration:

- All visual updates must ingest metrics derived exclusively from `variables.css`. No hardcoded dimensions, hex codes, typography sizes or raw pixel radiuses unless scoped exclusively inside a custom graphical override.
- Leverage standard `input-base`, `btn btn-primary`, `card`, `spinner` utilities imported at the root context inside `index.css`.
- New operational logic containing potentially catastrophic breakpoints must be isolated safely within internal Error Boundary thresholds.
- Commits observe standard Conventional Commit logic schema configurations (e.g. `feat(core): update layout`, `fix(auth): normalize loading triggers`).
- Adhere rigidly to the semantic HTML structure definitions (favor `main`, `aside`, `nav`, `section` against excessive isolated containers).

## Future Improvements

- Implementation of centralized React State abstraction utilizing specialized libraries like Redux Toolkit or Zustand.
- Extension of Dark Mode toggles interacting fundamentally with foundational CSS tokens globally.
- Integration framework coverage via standard Jest layouts matching critical business logic components.
- Refinement of cache implementations using specialized handling routines like React Query.

## Contributors

Developed directly to fulfill user architectural restructuring requirements.
