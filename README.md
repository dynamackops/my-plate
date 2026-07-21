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
- Add, edit, complete, postpone, move, and remove item actions
- Subtasks with visible progress
- Search, status filters, and sorting controls
- Weekly, biweekly, and monthly planning periods
- Editable overall and category capacity limits
- Focus Display for a monitor, smart display, or always-visible home screen
- Reduced motion, large text, high contrast, and density preferences
- Responsive layouts for desktop, tablet, and mobile
- Browser-local persistence with no account or backend required

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

The MVP has no authentication, payments, analytics, AI APIs, or backend
services. Its state layer is intentionally separated so remote persistence can
be introduced later.

## Run locally

### Requirements

- Node.js 20 or newer
- npm

### Setup

```bash
git clone https://github.com/dynamackops/my-plate.git
cd my-plate
npm install
npm run dev
```

Vite will print the local development address in the terminal.

## Available commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run lint     # Run static code checks
npm run preview  # Preview the production build locally
```

## Privacy

My Plate stores tasks and preferences in the current browser using
LocalStorage. Data is not sent to a server, but it is also not synchronized
between devices. Clearing browser storage will clear the saved plate.

## Project structure

```text
src/
├── App.tsx       # Dashboard and interactive components
├── store.ts      # Zustand state and local persistence
├── lib.ts        # Capacity, date, and suggestion logic
├── types.ts      # Core application data types
├── index.css     # Design system and responsive styles
└── main.tsx      # React entry point
```

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
