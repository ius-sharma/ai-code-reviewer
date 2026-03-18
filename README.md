# AI Code Reviewer

> An AI-powered developer tool that analyzes source code and provides suggestions, explanations, quality scores, and improved code fixes — powered by an open-source LLM via Groq.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [How to Run Locally](#how-to-run-locally)
- [Future Improvements](#future-improvements)

---

## Project Overview

**AI Code Reviewer** is a full-stack web application designed to help developers write better code faster. Users paste or upload source code, select a language, and receive instant AI-powered analysis including a code quality score, actionable suggestions, a plain-English explanation, and a ready-to-apply improved version of their code — all within a modern, distraction-free editor interface.

The backend integrates with the **Groq LLM API** (using `llama3-70b-8192`) to perform the analysis, while the frontend is built with **Next.js**, **Monaco Editor**, and **shadcn/ui** for a polished developer experience.

---

## Features

| Feature                 | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Code Editor**         | Full-featured Monaco Editor (same engine as VS Code) with syntax highlighting |
| **Language Selector**   | Supports JavaScript, TypeScript, Python, Java, C, and C++                     |
| **File Upload**         | Upload source files directly from your machine                                |
| **AI Code Analysis**    | Sends code to the Groq LLM and returns structured feedback                    |
| **Code Quality Score**  | Numerical score (0–100) reflecting overall code quality                       |
| **AI Suggestions**      | Categorized improvement suggestions (bugs, performance, best practices)       |
| **AI Code Explanation** | Plain-English breakdown of what the code does                                 |
| **AI Suggested Fix**    | Improved version of the submitted code displayed in a read-only Monaco editor |
| **Apply Fix**           | One-click button to replace the current code with the AI-suggested fix        |
| **Collapsible Sidebar** | Workspace sidebar that collapses to a minimal rail to maximize editor space   |
| **Dark / Light Mode**   | Toggle between dark and light themes                                          |

---

## Tech Stack

### Frontend

| Technology                                                  | Purpose                                  |
| ----------------------------------------------------------- | ---------------------------------------- |
| [Next.js](https://nextjs.org/)                              | React framework with App Router          |
| [TypeScript](https://www.typescriptlang.org/)               | Type-safe development                    |
| [TailwindCSS](https://tailwindcss.com/)                     | Utility-first styling                    |
| [shadcn/ui](https://ui.shadcn.com/)                         | Accessible, composable UI components     |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | VS Code-grade code editor in the browser |

### Backend

| Technology                            | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| [Node.js](https://nodejs.org/)        | JavaScript runtime                  |
| [Express](https://expressjs.com/)     | REST API server                     |
| [Groq SDK](https://console.groq.com/) | LLM inference via `llama3-70b-8192` |

---

## Project Structure

```
ai-code-reviewer/
├── frontend/                   # Next.js application
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx        # Main UI component
│   │       ├── layout.tsx      # Root layout
│   │       └── globals.css     # Global styles
│   ├── components/
│   │   └── ui/                 # shadcn/ui components
│   ├── public/
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/                    # Express API server
│   ├── src/
│   │   ├── controllers/
│   │   │   └── analyze.controller.js   # Groq LLM logic
│   │   ├── routes/
│   │   │   └── analyze.route.js        # API route definitions
│   │   └── index.js                    # Express entry point
│   └── package.json
│
├── docs/                       # Project documentation
└── README.md
```

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [Groq API key](https://console.groq.com/) (free tier available)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-code-reviewer.git
cd ai-code-reviewer
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

## How to Run Locally

Open two terminal windows from the project root.

### Terminal 1 — Start the backend

```bash
cd backend
npm run start
```

The API server will be available at `http://localhost:5000`.

### Terminal 2 — Start the frontend

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`.

### API Endpoints

| Method | Endpoint            | Description                                                |
| ------ | ------------------- | ---------------------------------------------------------- |
| `POST` | `/api/analyze-code` | Analyze code and return score, suggestions, and fixed code |
| `POST` | `/api/explain-code` | Return a plain-English explanation of the submitted code   |

**Request body (both endpoints):**

```json
{
  "code": "function sum(a, b) { return a + b; }",
  "language": "javascript"
}
```

---

## Future Improvements

- [ ] **Authentication** — User accounts and saved review history
- [ ] **Copy to Clipboard** — One-click copy for the AI suggested fix
- [ ] **Language Auto-detection** — Automatically detect the programming language
- [ ] **Diff View** — Side-by-side comparison of original vs. fixed code
- [ ] **Export Report** — Download analysis results as PDF or Markdown
- [ ] **Multi-file Support** — Upload and analyze entire project folders
- [ ] **CI/CD Integration** — GitHub Action to trigger reviews on pull requests
- [ ] **Severity Levels** — Tag suggestions as critical, warning, or informational
- [ ] **Custom Rules** — Allow teams to define their own coding standards
- [ ] **Deployment** — Host on Vercel (frontend) + Railway or Render (backend)

---

<p align="center">Built with Next.js, Express, and Groq LLM</p>
