# PyOdyssey · From Foundations to Fluency

A tactile, focused Python curriculum that teaches syntax, logic, algorithms, and practical tracks with behavioral test grading. Every run executes real Python 3.12 in the browser through a locally bundled Pyodide WebAssembly runtime.

## Quickstart

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://127.0.0.1:4177/`).

Production build:

```bash
npm run build
npm run preview
```

The production build includes the local Pyodide runtime in `public/pyodide/`. No CDN is required.

---

## Architecture

PyOdyssey is built with modern web technologies designed for responsiveness and zero runtime friction:

- **Frontend core:** React 19, TypeScript, and Vite.
- **WebAssembly execution runtime:** Real Python 3.12 running inside a dedicated Web Worker via Pyodide. Running off the main UI thread ensures user computations never lock the browser, and runaway loops hit emergency timeout aborts safely.
- **Design system:** Minimalist, high-contrast dark theme (true black `#000000`, surface `#0C0C0C`, hairline borders `#3A2412`, restrained orange accent `#FF7A1A`). Light theme respects system preferences. All styles use 100% verified CSS custom properties.
- **Save system:** Safe local storage migration with full backward compatibility across schema versions. Supports base64 export and file download.

---

## Grading Model

PyOdyssey uses a multi-stage evaluation pipeline to verify learner solutions:

1. **Syntax & AST check:** Analyzes Python code before evaluation to provide immediate feedback on unclosed brackets, missing colons, or assignment inside conditionals (`=` vs `==`).
2. **Construct verification:** Validates that required language constructs (such as `def`, `fstring`, `yield`, or `@dataclass`) are actually utilized rather than bypassed.
3. **Behavioral test runner:** Executes the specified entrypoint function against multiple test cases serialized via JSON.
4. **Hidden test cases:** Every challenge includes hidden test inputs (negative values, empty collections, alternative edge cases) ensuring learners write general algorithmic solutions rather than hardcoded outputs.
5. **Pythonic line budget:** Evaluates non-comment, non-empty lines against a target budget to award 3 stars for clean, idiomatic code.

---

## Curriculum Structure

### 8 Realms · 75+ playable lessons · 8 mini-projects · 8 Ultimate Trials

| Realm | Title | Concepts Covered |
|---|---|---|
| 1 | The Toybox | `print()`, variables, strings, f-strings, arithmetic, `input()`, typecasting, Hero Card Generator mini-project |
| 2 | Logic Gates | Booleans, `==` vs `=`, `if/elif/else`, logical operators, nesting, Access Controller mini-project |
| 3 | Loop Factory | `while` loops, infinite loop safety, `for` loops, `range()`, `break`/`continue`, nested loops, Stream Statistics mini-project |
| 4 | Data Vaults | Lists, slicing, tuples, sets, dictionaries, nested mappings, Inventory Ledger mini-project |
| 5 | Function Foundry | `def`, parameters, returns, scope, `*args`/`**kwargs`, lambdas, Text Transformer Pipeline mini-project |
| 6 | Pythonic Sorcery | List/dict comprehensions, `zip()`/`enumerate()`, string cleaning, safe JSON config loading, `Counter` word frequency, exceptions, Pipeline Badge Formatter mini-project |
| 7 | OOP Citadel | Classes, `self`, `__init__`, class vs instance state, inheritance, polymorphism, `@dataclass` and `@property`, Hero Entity System mini-project |
| 8 | Practitioner Sanctum | Closures, decorators, generators with `yield`, context managers, testing assertion runner, binary search, two pointers, data cleaning, API route dispatching, Recursive Generator Pipeline mini-project |

### Pedagogy & Problem Standards

- **Three-part layout:** Every problem displays statement, real example function call and expected output, and a one-line task.
- **Hidden three-tier hints:** Hints stay collapsed until requested:
  1. *Concept:* Core Python mechanics and behavior.
  2. *Approach:* Algorithmic strategy without code dump.
  3. *Partial skeleton:* Function scaffold with docstrings.
- **Strict negative test pattern:** Every problem is verified by:
  - Reference solution passing all visible and hidden tests.
  - 2+ alternative correct implementations passing.
  - 3+ wrong implementations (off-by-one, hardcoded, wrong type) rejected by the test suite.
- **Zero emojis & sentence case:** Clean, professional typographic design system.

---

## Realistic Scope: Browser Sandbox vs Real Development

PyOdyssey is designed for rapid deliberate practice of Python language fundamentals, data structures, and algorithmic reasoning without environment setup friction.

### What is covered
- Python 3.12 language semantics and standard data structures.
- First-class functions, closures, decorators, generators, and iterators.
- Object-oriented programming: inheritance, polymorphism, properties, and dataclasses.
- Built-in algorithms: two pointers, binary search, sorting, and frequency analysis.
- Virtual in-memory file I/O with standard `open()` and `with` context managers.
- Pure Python data cleaning and routing logic.

### What is NOT covered
- **Real operating system processes:** Subprocesses (`subprocess`), threading with OS threads, and system signal handling.
- **Network sockets:** Network calls (`socket`, raw `urllib`, `requests`) are blocked in the browser sandbox.
- **Native binary C-extensions:** Packages that compile against local C/Fortran toolchains.
- **Terminal environments:** Terminal CLI arguments (`sys.argv`), shell pipes, and daemon processes.
- **Package ecosystems:** Dependency resolution, virtual environment activation, and package publishing.

---

## Practicing Outside the Browser: Developer Checklist

To transition from browser practice to real-world software development:

### 1. Install Python 3.12+ locally
Download the official release from [python.org](https://www.python.org/) or install via your system package manager:
```bash
# macOS (Homebrew)
brew install python@3.12

# Linux (Debian/Ubuntu)
sudo apt update && sudo apt install python3 python3-venv python3-pip

# Windows (Winget)
winget install Python.Python.3.12
```

### 2. Isolate projects with virtual environments (`venv`)
Never install project packages into the global system Python:
```bash
# Create environment
python -m venv .venv

# Activate environment
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1
```

### 3. Manage dependencies (`pip` or `uv`)
```bash
pip install -r requirements.txt
# Or use the high-performance package manager:
# pip install uv && uv pip install -r requirements.txt
```

### 4. Write tests with `pytest`
Real-world Python projects use `pytest` for automated regression suites:
```bash
pip install pytest
pytest -v
```

### 5. Format and lint with `ruff`
Format code and catch bugs before runtime:
```bash
pip install ruff
ruff check .
ruff format .
```

### 6. Track changes with `git`
```bash
git init
git add .
git commit -m "feat: initial commit"
```

---

## Deployment

PyOdyssey compiles to a fully static bundle in `dist/` with relative asset links (`base: './'`). It can be hosted on any static hosting provider or subpath without an application server.

### Cloudflare Pages

1. Log in to the Cloudflare dashboard and go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select your repository.
3. In **Build settings**:
   - **Framework preset:** `Vite` (or `None`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy**.
5. The `public/_headers` file will automatically configure `Content-Type: application/wasm` for `.wasm` files.

### GitHub Pages

A ready-to-use GitHub Actions workflow is provided at `.github/workflows/deploy.yml`.

1. Go to your repository on GitHub.
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. Push to the `main` branch (or run the workflow manually under **Actions** > **Deploy to GitHub Pages**).
5. The site will publish automatically to `https://<username>.github.io/<repo>/`.

---

## Verification

```bash
npm test
npm run css:check
npm run build
```
