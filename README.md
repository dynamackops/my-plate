# My Plate

**A gentle, visual capacity planner for understanding what is taking up your energy.**

[Open the live app](https://my-plate-capacity.jasminegm100.chatgpt.site)

My Plate helps visual thinkers and neurodivergent adults see not only what they
need to do, but how much mental, emotional, social, sensory, and practical
capacity their responsibilities consume.

Instead of treating every task as an equal line in a list, My Plate places each
responsibility on a literal digital plate. Bigger commitments take up more
space, making overload easier to recognize before adding something new.

## Features

- Literal visual plate with capacity-sized task objects
- All-items view plus Work, Personal, Health, Social, Creative, and Waiting plates
- Gentle fullness states from **Open** to **Overflowing**
- Manual capacity sizes from 5 to 40 points
- Guided estimates based on time, complexity, effort, and recovery needs
- Optional AI-powered **Capacity Assist** estimates with explicit user confirmation
- Built-in browser dictation and Wispr Flow-ready title and description fields
- Add, edit, complete, postpone, move, and remove item actions
- Subtasks with visible progress
- Search, status filters, and sorting controls
- Weekly, biweekly, and monthly planning periods
- Editable overall and category capacity limits
- Focus Display for a monitor, smart display, or always-visible home screen
- Reduced motion, large text, high contrast, and density preferences
- Responsive layouts for desktop, tablet, and mobile
- Browser-local persistence; Capacity Assist remains entirely optional

## Capacity model

The default plate holds **100 points** per planning period.

| Size | Points | Intended meaning |
| --- | ---: | --- |
| Tiny | 5 | A quick, light lift |
| Small | 10 | Needs a little focus |
| Medium | 20 | A meaningful effort |
| Large | 30 | A major commitment |
| Extra large | 40 | A lot to carry |

The overall plate uses calm, nonjudgmental fullness states:

| Capacity used | State |
| ---: | --- |
| 0–49% | Open |
| 50–74% | Balanced |
| 75–89% | Getting full |
| 90–100% | Full |
| Over 100% | Overflowing |

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Lucide React
- LocalStorage

The app has no authentication, payments, or analytics. Its state layer remains
browser-local; the only server request is an optional Capacity Assist estimate
that runs when a user chooses to ask for one.

## Run locally

### Requirements

- Node.js 20 or newer
- npm

### Setup

```bash
git clone https://github.com/dynamackops/my-plate.git
cd my-plate
npm install
npm run test
npm run dev
```

Vite will print the local development address in the terminal.

### Capacity Assist setup

Capacity Assist sends the task title and description (when present) plus the
five answers entered in its panel to a server-side endpoint. The endpoint calls
the OpenAI Responses API with strict structured output and validates that the
result is exactly one of Tiny (5), Small (10), Medium (20), Large (30), or Extra
Large (40). The API key is read only by the deployed worker and is never placed
in frontend code.

Copy the example environment file and add a server-side OpenAI API key:

```bash
cp .env.example .env
```

```dotenv
OPENAI_API_KEY=your_server_side_api_key
# Optional; defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

For the hosted Sites worker, configure the same values as server runtime
secrets/environment variables. A plain Vite development server serves only the
frontend, so AI requests will show the designed unavailable-state message
unless `/api/capacity-assist` is provided by a compatible local worker runtime.
All manual task creation and capacity controls continue to work without these
variables or when the AI service is unavailable.

### Voice input and Wispr Flow

The task title and description include two optional voice paths:

- **Dictate** uses the browser’s Web Speech API when it is available. Browser
  support varies, and some browsers send microphone audio to their speech
  service for recognition.
- **Wispr Flow** focuses the chosen field so an installed Wispr Flow desktop or
  mobile client can insert text using the user’s existing Flow shortcut or
  keyboard. No Wispr credential is stored by My Plate.

Wispr Flow’s direct transcription API currently requires approved developer
access. A future direct API integration should keep its credential server-side,
as Capacity Assist does; the current integration works immediately with the
standard Wispr Flow app and avoids adding another backend dependency.

## Available commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run lint     # Run static code checks
npm run test     # Test Capacity Assist validation and failure handling
npm run preview  # Preview the production build locally
```

## Privacy

My Plate stores tasks and preferences in the current browser using
LocalStorage. Data is not synchronized between devices, and clearing browser
storage will clear the saved plate. When—and only when—a user selects Capacity
Assist, the information visible in that panel is sent to the configured AI
service to generate the requested estimate.

## Project structure

```text
src/
├── App.tsx       # Dashboard and interactive components
├── CapacityAssist.tsx # Optional AI estimate panel
├── capacity-assist.ts # AI request types, client, and response validation
├── store.ts      # Zustand state and local persistence
├── lib.ts        # Capacity, date, and suggestion logic
├── types.ts      # Core application data types
├── index.css     # Design system and responsive styles
└── main.tsx      # React entry point
server/
├── capacity-assist.js # Server-only OpenAI request and validation
└── index.js      # Worker routes and static application fallback
```

## Responsible AI

My Plate uses AI to help interpret workload information a user chooses to
provide. It does not diagnose users, make health decisions, or judge whether a
task should be done. AI-generated capacity estimates are informational,
optional, and editable. A suggestion never changes a task until the user
explicitly confirms it, and the existing manual capacity controls remain
available at all times. You know your capacity best.

## Roadmap

- Custom categories
- Optional accounts and cross-device sync
- Task rollover between planning periods
- Reusable planning templates
- Data export and import
- Child-friendly display options

## Product principle

> Capacity is information, not a measure of worth.

My Plate is designed to help people make kinder, more realistic decisions about
their energy—not to create another source of productivity guilt.
