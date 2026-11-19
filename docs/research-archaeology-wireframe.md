# Research Archaeology screen wireframe

## Direction

An editorial research dossier: paper-like, evidence-forward, and calm enough to scan in under two minutes. It keeps the Field Map's black-rule and yellow-accent visual language, but replaces the dense dashboard with a vertically scrolling reading experience.

## Desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ FIELD GUIDE / RESEARCH ARCHAEOLOGY                         OPEN FIELD MAP  → │
├──────────────────────────────────────────────────────────────────────────────┤
│ AI-NATIVE DESIGN AND ENGINEERING                                             │
│ Oct 2025—Jul 2026  ·  6 conversations  ·  19 evidence-backed conclusions    │
├───────────────────────────────────────────────────┬──────────────────────────┤
│ 01  WHERE YOU LEFT OFF                            │ RESUME HERE              │
│                                                   │                          │
│ The work progressed from a question about         │ Implement the Dark Mode  │
│ code-generating systems into a point of view,     │ vertical slice through   │
│ teaching direction, and repository workflow.      │ the complete workflow.   │
│                                                   │                          │
│ [4 sources cited ▾]                               │ 1. Record breakpoints    │
│                                                   │ 2. Note human judgment   │
│                                                   │ 3. Unify the framework   │
├───────────────────────────────────────────────────┴──────────────────────────┤
│ 02  WHAT YOU ALREADY KNOW                                                 06 │
│ ┌──────────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │ Product intent needs an     │  │ Repository knowledge and tests are │ │
│ │ explicit translation layer. │  │ control surfaces for AI agents.    │ │
│ │ YOUR WORDS · 2 cites        │  │ YOUR WORDS · 3 cites               │ │
│ └──────────────────────────────┘  └───────────────────────────────────────┘ │
│ ...                                                                          │
├───────────────────────────────────┬──────────────────────────────────────────┤
│ 03  DECISIONS                    05│ REJECTED DIRECTIONS                    03│
│ ✓ Help engineers become thinkers   │ × Replacing-engineers framing            │
│ ✓ Keep humans in the loop          │ × Generic chat / Linear / Notion UI      │
│ ✓ Build a canonical framework      │ × Robot metaphors                        │
│ ✓ Use a Project Workspace          │                                          │
├───────────────────────────────────┴──────────────────────────────────────────┤
│ 04  WHAT REMAINS UNRESOLVED                                             04 │
│ 01  Where does the first end-to-end system break?                           │
│ 02  Who maintains repository memory and resolves duplicated guidance?       │
│ 03  How should the educational coach be evaluated?                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ 05  HOW THE IDEA EVOLVED                                                   │
│ OCT 12  ● “What does it mean to design systems that generate code?”         │
│ JUN 12  │ “How would someone build an AI-native React web app today?”       │
│ JUL 10  ● “If chat interfaces are wrong for education, what is right?”      │
│ JUL 13  │ “Is this an agent—or is it more of a workflow?”                   │
│ JUL 29  ● “How does this system work with humans in the loop?”              │
├──────────────────────────────────────────────────────────────────────────────┤
│ 06  ORIGINAL EVIDENCE                                                       │
│ Designing code-generating systems 122 messages                   [EXPAND]    │
│ Building AI Native React          227 messages                   [EXPAND]    │
│ AI-Native Product Design          142 messages                   [EXPAND]    │
│ Scout: AI-native Architecture      68 messages                   [EXPAND]    │
│ Full-Stack Design Articles        186 messages                   [EXPAND]    │
│ Full Stack React Help             36 messages                    [EXPAND]    │
│                                                                              │
│ Expanded evidence appears inline with exact excerpt, author, date, and IDs. │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile

The same content becomes a single column in priority order:

1. Header and idea metadata
2. Where you left off
3. Resume here
4. Findings
5. Decisions
6. Rejected directions
7. Open questions
8. Timeline
9. Original evidence

Evidence expands inline so the user never loses the conclusion being verified. The Field Map remains a secondary navigation destination rather than a competing panel.

## Interaction contract

- Every conclusion exposes its evidence through a native expandable control.
- Evidence shows the exact excerpt, author, timestamp, conversation ID, and message ID.
- User decisions and assistant-supported findings have visibly different provenance labels.
- The timeline starts condensed to major research events; the complete question-led trail remains available.
- The screen does not invent a chat-launch workflow. “Resume here” is guidance until a later phase adds an action.
