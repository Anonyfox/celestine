# NPM Package Kickstarter

A complete playbook to bootstrap a modern TypeScript NPM package from scratch with professional tooling. This setup provides:

- ✅ **TypeScript** with strict mode and modern ES2022 target
- ✅ **Dual package output** (ESM + CommonJS) with proper exports
- ✅ **tsup** for fast, zero-config bundling with tree-shaking
- ✅ **Biome** for ultra-fast linting and formatting (replaces ESLint + Prettier)
- ✅ **Node.js native test runner** (no Jest/Vitest dependency needed)
- ✅ **tsx** for running TypeScript directly during development
- ✅ **TypeDoc** for auto-generated API documentation with custom branding
- ✅ **GitHub Actions** for CI, npm publishing with provenance, and docs deployment
- ✅ **Proper package.json exports** for maximum compatibility

---

## Prerequisites

- Node.js 18+ (we use `.nvmrc` to pin the version)
- npm 9+
- A GitHub repository (for CI/CD workflows)
- An npm account (for publishing)

---

## Step 1: Initialize the Package

```bash
# Create project directory
mkdir my-package && cd my-package

# Initialize git
git init

# Initialize npm (follow prompts)
npm init
```

---

## Step 2: Create `.nvmrc`

Pin your Node.js version:

```
18
```

---

## Step 3: Create `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage/
.nyc_output/

# Temporary files
*.tmp
.cache/

# Documentation (generated, do not commit)
docs/
```

---

## Step 4: Install Dev Dependencies

```bash
npm install --save-dev \
  typescript \
  tsup \
  tsx \
  @types/node \
  @biomejs/biome \
  typedoc
```

---

## Step 5: Create `package.json`

Replace your generated `package.json` with this structure (update name, description, author, repository accordingly):

```json
{
  "name": "my-package",
  "version": "0.1.0",
  "description": "Your package description",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "node --import tsx --test $(find src -name '*.test.ts' -type f)",
    "test:watch": "node --import tsx --test --watch $(find src -name '*.test.ts' -type f)",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "check": "npm run typecheck && npm run lint",
    "prepublishOnly": "npm run check && npm run build",
    "typecheck": "tsc --noEmit",
    "docs": "typedoc",
    "docs:serve": "npx serve docs",
    "release:patch": "npm run check && npm version patch -m 'Release v%s' && git push && git push --tags",
    "release:minor": "npm run check && npm version minor -m 'Release v%s' && git push && git push --tags",
    "release:major": "npm run check && npm version major -m 'Release v%s' && git push && git push --tags"
  },
  "keywords": [],
  "author": {
    "name": "Your Name",
    "email": "your@email.com",
    "url": "https://your-website.com"
  },
  "license": "MIT",
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/your-username"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/my-package.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/my-package/issues"
  },
  "homepage": "https://your-username.github.io/my-package"
}
```

### Key Points

| Field              | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `"type": "module"` | Native ESM support                                   |
| `main`             | Entry point for CommonJS (`require()`)               |
| `module`           | Entry point for ESM (`import`)                       |
| `types`            | TypeScript declarations                              |
| `exports`          | Modern conditional exports with types-first ordering |
| `files`            | What gets published to npm (minimal!)                |
| `engines`          | Declare Node.js/npm requirements                     |
| `funding`          | Enable `npm fund` and sponsor prompts                |
| `homepage`         | Points to GitHub Pages docs site                     |

---

## Step 6: Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Key Settings Explained

| Setting                     | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `target: ES2022`            | Modern JavaScript output                 |
| `module: ESNext`            | Native ESM modules                       |
| `moduleResolution: bundler` | Modern resolution for bundlers like tsup |
| `strict: true`              | All strict type-checking options         |
| `declaration: true`         | Generate `.d.ts` files                   |
| `exclude: **/*.test.ts`     | Don't include tests in build             |

---

## Step 7: Create `tsup.config.ts`

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: "es2022",
  outDir: "dist",
});
```

### What tsup Does

- Bundles your TypeScript into both ESM (`.js`) and CommonJS (`.cjs`)
- Generates type declarations (`.d.ts` and `.d.cts`)
- Tree-shakes unused code
- Creates sourcemaps for debugging
- Cleans the `dist/` folder on each build

---

## Step 8: Create `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "src/**/*",
      "*.ts",
      "*.json",
      "!!**/node_modules",
      "!!**/dist",
      "!!**/*.log",
      "!!**/package-lock.json"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "off"
      },
      "style": {
        "noNonNullAssertion": "off",
        "useTemplate": "warn"
      },
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    },
    "linter": {
      "enabled": true
    }
  }
}
```

### Why Biome?

- **~100x faster** than ESLint + Prettier combined
- Single tool for linting AND formatting
- Zero configuration dependencies
- Written in Rust

---

## Step 9: Create Source Files

### `src/index.ts`

````typescript
/**
 * My Package - Your package description
 *
 * @remarks
 * Detailed description of what your package does.
 *
 * @packageDocumentation
 */

/**
 * Greets a person by name.
 *
 * @param name - The name of the person to greet
 * @returns A friendly greeting message
 *
 * @example
 * ```typescript
 * import { greet } from 'my-package';
 *
 * const message = greet('World');
 * console.log(message); // "Hello, World!"
 * ```
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/**
 * Adds two numbers together.
 *
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 *
 * @example
 * ```typescript
 * import { add } from 'my-package';
 *
 * const result = add(2, 3);
 * console.log(result); // 5
 * ```
 */
export function add(a: number, b: number): number {
  return a + b;
}
````

### `src/index.test.ts`

```typescript
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { add, greet } from "./index.js";

describe("greet", () => {
  it("should return a greeting message", () => {
    const result = greet("World");
    assert.equal(result, "Hello, World!");
  });

  it("should handle empty string", () => {
    const result = greet("");
    assert.equal(result, "Hello, !");
  });

  it("should handle special characters", () => {
    const result = greet("World! 🎉");
    assert.equal(result, "Hello, World! 🎉!");
  });
});

describe("add", () => {
  it("should add two positive numbers", () => {
    assert.equal(add(2, 3), 5);
  });

  it("should add negative numbers", () => {
    assert.equal(add(-1, -2), -3);
  });

  it("should handle zero", () => {
    assert.equal(add(0, 5), 5);
    assert.equal(add(5, 0), 5);
  });

  it("should handle decimals", () => {
    assert.equal(add(0.1, 0.2), 0.30000000000000004); // JS floating point!
  });
});
```

### Key Points About Testing

- Uses **Node.js native test runner** (no external test framework needed!)
- Import from `node:test` for `describe` and `it`
- Import from `node:assert` for assertions
- Test files use `.test.ts` suffix (co-located with source)
- Import with `.js` extension (required for ESM)

---

## Step 10: Create `LICENSE`

MIT License (replace year and name):

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Step 11: Create `README.md`

Create a professional README with shields, logo, and branded footer. Replace `my-package`, `your-username`, and URLs accordingly:

````markdown
# My Package 📦

[![npm version](https://img.shields.io/npm/v/my-package.svg?style=flat-square)](https://www.npmjs.com/package/my-package)
[![npm downloads](https://img.shields.io/npm/dm/my-package.svg?style=flat-square)](https://www.npmjs.com/package/my-package)
[![CI](https://img.shields.io/github/actions/workflow/status/your-username/my-package/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/your-username/my-package/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen?style=flat-square)](https://your-username.github.io/my-package)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square&logo=node.js)](https://nodejs.org/)

**Your one-liner package description goes here.** Explain what the package does in a compelling way. Mention key benefits. TypeScript-native, works everywhere.

<div align="center">
  <img src="https://raw.githubusercontent.com/your-username/my-package/main/assets/logo.png" alt="My Package Logo" width="300">
</div>

## Features

- 🎯 **Feature One** - Description of feature
- 📦 **Feature Two** - Description of feature
- 🔒 **Type-safe** - Full TypeScript support
- 🧪 **Well-tested** - Built with Node.js native test runner
- 🚀 **Minimal dependencies** - Lightweight and fast

## Installation

```bash
npm install my-package
```

## Quick Start

```typescript
import { greet, add } from "my-package";

console.log(greet("World")); // Hello, World!
console.log(add(2, 3)); // 5
```

## Usage

### Basic Example

```typescript
import { greet } from "my-package";

const message = greet("Developer");
console.log(message); // Hello, Developer!
```

### Advanced Example

```typescript
import { add } from "my-package";

const sum = add(10, 20);
console.log(sum); // 30
```

## API

### `greet(name: string): string`

Returns a greeting message.

**Parameters:**

- `name` - The name to greet

**Returns:** A friendly greeting string

### `add(a: number, b: number): number`

Adds two numbers together.

**Parameters:**

- `a` - First number
- `b` - Second number

**Returns:** The sum of a and b

## Development

```bash
npm install        # Install dependencies
npm test           # Run tests
npm run build      # Build package
npm run docs       # Generate documentation
```

## License

MIT

---

<div align="center">

### Support

If this package helps your project, consider sponsoring its maintenance:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/your-username)

---

**[Your Name](https://your-website.com) • [MIT License](LICENSE)**

</div>
````

### README Structure Explained

| Section       | Purpose                                             |
| ------------- | --------------------------------------------------- |
| Title + Emoji | Memorable, scannable package name                   |
| Shields       | At-a-glance project health (npm, CI, docs, license) |
| One-liner     | Compelling value proposition                        |
| Logo          | Visual branding (optional but recommended)          |
| Features      | Bulleted highlights with emojis                     |
| Installation  | Copy-paste ready                                    |
| Quick Start   | Immediate value demonstration                       |
| API           | Reference documentation                             |
| Footer        | Sponsor CTA + author branding                       |

### Creating a Logo (Optional)

If you want a logo:

1. Create an `assets/` directory in your repo
2. Add your logo as `assets/logo.png` (recommended: 600x600px, transparent background)
3. Reference it with the raw GitHub URL: `https://raw.githubusercontent.com/your-username/my-package/main/assets/logo.png`

---

## Step 12: TypeDoc Configuration

TypeDoc generates beautiful API documentation from your JSDoc comments. We configure it with custom branding.

### Create `typedoc.json`

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "name": "My Package",
  "includeVersion": true,
  "readme": "README.md",
  "githubPages": true,
  "hideGenerator": true,
  "searchInComments": true,
  "categorizeByGroup": true,
  "sort": ["source-order"],
  "kindSortOrder": [
    "Function",
    "TypeAlias",
    "Interface",
    "Class",
    "Enum",
    "Variable"
  ],
  "navigation": {
    "includeCategories": true,
    "includeGroups": true
  },
  "visibilityFilters": {
    "protected": false,
    "private": false,
    "inherited": true,
    "external": false
  },
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/dist/**"
  ],
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "treatWarningsAsErrors": false,
  "validation": {
    "notExported": true,
    "invalidLink": true,
    "notDocumented": false
  },
  "customCss": "./typedoc-custom.css",
  "customFooterHtml": "<footer class=\"tsd-page-footer\"><div class=\"container\"><p>Made with <span style=\"color: #e74c3c\">♥</span> by <a href=\"https://your-website.com\" target=\"_blank\" rel=\"noopener\">Your Name</a></p></div></footer>"
}
```

### Key TypeDoc Settings

| Setting                             | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `githubPages: true`                 | Adds `.nojekyll` file for GitHub Pages         |
| `hideGenerator: true`               | Removes "Generated by TypeDoc" footer          |
| `searchInComments: true`            | Enables searching within JSDoc comments        |
| `sort: ["source-order"]`            | Keeps exports in the order you defined them    |
| `kindSortOrder`                     | Prioritizes functions over types in navigation |
| `customCss`                         | Points to your custom styling                  |
| `customFooterHtml`                  | Custom branded footer                          |
| `excludePrivate/Protected/Internal` | Only document public API                       |

### Create `typedoc-custom.css`

Custom styling for your documentation (customize colors to match your brand):

```css
/* Custom styling for documentation - Brand colors */

:root {
  --color-primary: #e95420; /* Your brand color */
  --color-primary-hover: #ba431a;
  --color-footer-bg: #000000;
  --color-footer-text: #ffffff;
}

/* Brand color for links */
.tsd-navigation a,
.tsd-index-link a,
.tsd-signature-type a,
.tsd-breadcrumb a {
  color: var(--color-primary);
}

.tsd-navigation a:hover,
.tsd-index-link a:hover,
.tsd-signature-type a:hover,
.tsd-breadcrumb a:hover {
  color: var(--color-primary-hover);
}

/* Better code blocks */
pre code {
  font-size: 0.9em;
  line-height: 1.5;
}

/* Improved spacing */
.tsd-page-title {
  margin-bottom: 2rem;
}

.tsd-panel-group {
  margin: 2rem 0;
}

/* Signature highlighting */
.tsd-signature {
  border-left: 3px solid var(--color-primary);
  padding-left: 1rem;
}

/* Better example blocks */
.tsd-comment pre {
  background: var(--color-background-alt);
  border-radius: 0.5rem;
  padding: 1rem;
}

/* Custom Footer */
.tsd-page-footer {
  margin-top: 4rem;
  padding: 2rem 0;
  background-color: var(--color-footer-bg);
  color: var(--color-footer-text);
  text-align: center;
  border-top: 1px solid #333;
}

.tsd-page-footer p {
  margin: 0.5rem 0;
}

.tsd-page-footer a {
  color: var(--color-primary);
  text-decoration: none;
  margin: 0 0.5rem;
}

.tsd-page-footer a:hover {
  color: var(--color-primary-hover);
  text-decoration: none;
}

/* Ensure footer is at bottom */
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.container-main {
  flex: 1;
}
```

### Generate and Preview Docs

```bash
npm run docs          # Generate documentation
npm run docs:serve    # Preview locally at http://localhost:3000
```

---

## Step 13: GitHub Actions - CI Workflow

Create `.github/workflows/ci.yml` for continuous integration:

```yaml
# GitHub Actions workflow for continuous integration
#
# This workflow runs on:
# - All pushes to any branch (except main, to avoid duplication with docs workflow)
# - All pull requests
#
# It will verify:
# - TypeScript type checking passes
# - Linting passes
# - All tests pass
# - Package builds successfully

name: CI

on:
  push:
    branches-ignore:
      - main
  pull_request:
    branches:
      - "**"

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build package
        run: npm run build

      - name: Check package exports
        run: node -e "import('file://$PWD/dist/index.js').then(() => console.log('✅ ESM import works'))"

      - name: Check package size
        run: |
          echo "📦 Package sizes:"
          ls -lh dist/index.js dist/index.cjs | awk '{print $9, $5}'
```

### CI Workflow Features

- **Matrix testing** across Node.js 18, 20, and 22
- Runs on all PRs and non-main pushes
- Validates TypeScript, linting, tests, and build
- Verifies ESM exports actually work
- Reports package sizes

---

## Step 14: GitHub Actions - NPM Publishing

Create `.github/workflows/publish.yml` for automated npm publishing:

````yaml
# GitHub Actions workflow for publishing to npm
#
# This workflow will:
# 1. Only run when you push a version tag (e.g., v1.0.0)
# 2. Run all checks (typecheck, lint, test, build)
# 3. Publish to npm with provenance
# 4. Create a GitHub release
#
# How to use:
# 1. Set up NPM_TOKEN in GitHub Secrets (see below)
# 2. Bump version: npm version patch|minor|major
# 3. Push with tags: git push && git push --tags
# 4. Workflow runs automatically!

name: Publish to npm

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:

permissions:
  contents: write
  id-token: write

concurrency:
  group: "npm-publish"
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build package
        run: npm run build

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body: |
            ## Changes in ${{ github.ref_name }}

            See [CHANGELOG](https://github.com/your-username/my-package/blob/main/CHANGELOG.md) for details.

            ### Installation
            ```bash
            npm install my-package@${{ github.ref_name }}
            ```
          draft: false
          prerelease: false
````

### Publish Workflow Features

- **Tag-triggered**: Only runs on `v*.*.*` tags
- **Full validation**: Runs all checks before publishing
- **Provenance**: Publishes with npm provenance for supply chain security
- **GitHub Release**: Automatically creates a release with install instructions
- **Manual trigger**: Can also be triggered manually via `workflow_dispatch`

---

## Step 15: GitHub Actions - Documentation Deployment

Create `.github/workflows/docs.yml` for auto-deploying docs to GitHub Pages:

```yaml
# GitHub Actions workflow for auto-deploying documentation
#
# To enable: Enable GitHub Pages in repository settings:
#   Settings → Pages → Source: GitHub Actions
#
# This workflow will:
# 1. Run on every push to main branch
# 2. Generate documentation using TypeDoc
# 3. Deploy to GitHub Pages automatically

name: Deploy Documentation

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run checks
        run: npm run check

      - name: Run tests
        run: npm test

      - name: Generate documentation
        run: npm run docs

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: "./docs"

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Docs Workflow Features

- **Auto-deploy on main**: Every push to main updates docs
- **Full validation first**: Runs checks and tests before deploying
- **GitHub Pages integration**: Uses the modern Pages deployment action
- **Concurrency protection**: Prevents concurrent deployments

### Enable GitHub Pages

1. Go to your repo: **Settings → Pages**
2. Under "Build and deployment", select **Source: GitHub Actions**
3. Push to main - your docs will deploy automatically!

---

## Step 16: Setting Up NPM_TOKEN

For the publish workflow to work, you need to configure an npm token:

1. Go to [npmjs.com](https://www.npmjs.com) → **Access Tokens** → **Generate New Token (Classic)**
2. Select **"Automation"** type (for CI/CD)
3. Copy the token
4. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
5. Name: `NPM_TOKEN`, Value: paste your token

---

## Step 17: Verify Everything Works

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Build
npm run build

# Verify output
ls -la dist/
# Should show: index.js, index.cjs, index.d.ts, index.d.cts, etc.

# Generate docs
npm run docs

# Preview docs locally
npm run docs:serve
```

---

## Publishing Workflow

Once everything is set up, publishing is simple:

```bash
# Bump version, create git tag, and push
npm run release:patch   # 0.1.0 → 0.1.1
npm run release:minor   # 0.1.0 → 0.2.0
npm run release:major   # 0.1.0 → 1.0.0
```

The GitHub Action will automatically:

1. Run all checks (typecheck, lint, test)
2. Build the package
3. Publish to npm with provenance
4. Create a GitHub release

---

## Final Project Structure

```
my-package/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI on PRs and branches
│       ├── docs.yml            # Auto-deploy docs on main
│       └── publish.yml         # Publish on version tags
├── assets/
│   └── logo.png                # Package logo (optional)
├── dist/                       # Generated (git-ignored)
│   ├── index.js                # ESM bundle
│   ├── index.cjs               # CommonJS bundle
│   ├── index.d.ts              # ESM types
│   └── index.d.cts             # CommonJS types
├── docs/                       # Generated (git-ignored)
├── src/
│   ├── index.ts                # Main entry point
│   └── index.test.ts           # Tests (co-located)
├── .gitignore
├── .nvmrc
├── biome.json
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
├── tsup.config.ts
├── typedoc.json
└── typedoc-custom.css          # Custom doc styling
```

---

## Quick Reference: Available Commands

| Command                 | Description                        |
| ----------------------- | ---------------------------------- |
| `npm run build`         | Build ESM + CJS bundles with types |
| `npm run dev`           | Run src/index.ts directly          |
| `npm test`              | Run all tests                      |
| `npm run test:watch`    | Run tests in watch mode            |
| `npm run typecheck`     | Type check without emitting        |
| `npm run lint`          | Check linting                      |
| `npm run lint:fix`      | Auto-fix lint issues               |
| `npm run format`        | Format all files                   |
| `npm run check`         | Run typecheck + lint               |
| `npm run docs`          | Generate TypeDoc documentation     |
| `npm run docs:serve`    | Preview docs locally               |
| `npm run release:patch` | Bump patch version and push        |
| `npm run release:minor` | Bump minor version and push        |
| `npm run release:major` | Bump major version and push        |

---

## Summary

This setup gives you:

- 🚀 **Modern TypeScript** with strict type checking
- 📦 **Dual ESM/CJS output** for maximum compatibility
- ⚡ **Fast builds** with tsup (esbuild under the hood)
- 🧹 **Fast linting/formatting** with Biome
- 🧪 **Zero-dependency testing** with Node.js native test runner
- 📚 **Auto-generated docs** with TypeDoc + custom branding
- 🔄 **Automated CI/CD** with GitHub Actions (test, publish, deploy docs)
- ✨ **One-command releases** to npm with provenance
- 🌐 **Auto-deployed documentation** to GitHub Pages

Happy coding! 🎉
