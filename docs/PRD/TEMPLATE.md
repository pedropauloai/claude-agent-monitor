# [Project Name] - PRD (Product Requirements Document)

> [Short phrase describing the project in one line]

**Version**: 1.0.0
**Date**: YYYY-MM-DD
**Status**: Draft | Active | Completed
**License**: MIT | Apache-2.0 | ...

---

# PART 1 - PRD (WHAT to build)

---

## 1. Product Vision

### Name
**[Project Name]**

### Value Proposition
What this product does and why it matters. What problem it solves and for whom.
Describe the value in 2-3 paragraphs.

### Target Audience
- Persona 1: description and primary need
- Persona 2: description and primary need

### Differentiator
- What makes this project unique
- Competitive advantages
- Why someone would choose this vs alternatives

---

## 2. Problem

### Current Situation
How things work today without this product.

### Pain Points
| Pain Point | Severity | Frequency |
|------------|----------|-----------|
| Pain point description 1 | High/Medium/Low | Frequency |
| Pain point description 2 | High/Medium/Low | Frequency |

### Opportunity
Why now is the right time. What technology or market shift enables this solution.

---

# PART 2 - SPEC (HOW to build)

---

## 3. Technical Architecture

### Overview
ASCII diagram or description of the high-level architecture.

```
[Component A] --> [Component B] --> [Component C]
```

### Data Flow
Describe how data flows between components.

### Technology Stack
| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React / Vue / etc | Reason |
| Backend | Node.js / Python / etc | Reason |
| Database | SQLite / Postgres / etc | Reason |

---

## 4. Data Model

Describe the main entities and their relationships.

### Main Entity
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Unique identifier |
| name | TEXT | Entity name |
| status | TEXT | Current state |
| created_at | TEXT (ISO8601) | Creation date |

---

## 5. API / Interfaces

### Endpoints (if applicable)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/resource | List resources |
| POST | /api/resource | Create resource |

### CLI Commands (if applicable)
```bash
project init         # Initialize the project
project start        # Start the server
project status       # Show status
```

---

## 6. UI / Components

Describe the main visual components, screens, and navigation flows.

### Main Screen
- Layout description
- Visible components
- User interactions

---

## 7. Implementation Details

Additional project-specific sections. Examples:
- Security and authentication
- Performance and caching
- External service integration
- Plugin/extension system

---

# PART 3 - EXECUTION (WHEN to build)

> **Note**: Detailed task tracking and context for each sprint lives in the sprint files.
> Use the sprint files for complete tasks and context.

---

## 8. MVP

Description of what constitutes the MVP (Minimum Viable Product).

| Sprint | Name | Tasks | Status | Sprint File |
|--------|------|-------|--------|-------------|
| 1 | Sprint Name | N | Planned | [sprint-01.md](../SPRINTS/sprint-01.md) |
| 2 | Sprint Name | N | Planned | [sprint-02.md](../SPRINTS/sprint-02.md) |

---

## 9. Backlog

Features planned for after the MVP:
- Future feature 1
- Future feature 2
- Future feature 3

---

# PART 4 - REFERENCE

---

## 10. File Structure

```
project/
  docs/
    PRD/
      PRD.md            # This document
    SPRINTS/
      sprint-01.md      # Sprint files with tasks
  src/
    ...                 # Source code
  README.md
  package.json
```

---

## Template Notes

This template follows the **4-part structure**:

| Part | Content | Question |
|------|---------|----------|
| **PART 1 - PRD** | Vision + Problem | WHAT to build and WHY? |
| **PART 2 - SPEC** | Architecture + Details | HOW to build it? |
| **PART 3 - EXECUTION** | Sprints + Backlog | WHEN to build it? |
| **PART 4 - REFERENCE** | File structure + Glossary | WHERE to find things? |

**Principles**:
- The PRD is a VISION document, not a detailed execution tracker
- Sprint files (`docs/SPRINTS/sprint-XX.md`) contain tasks and context per sprint
- Part 3 is an INDEX to the sprint files, not a duplication of their content
- Number sections for easy cross-referencing ("see PRD Section 3.2")
