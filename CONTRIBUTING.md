# Contributing to Tsogts.mn

First off, thank you for considering contributing to Tsogts.mn! 🎉

## Code of Conduct

Be respectful, inclusive, and professional.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment** (OS, browser, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case explanation**
- **Proposed solution**
- **Alternatives considered**

### Pull Requests

1. **Fork the repository**
2. **Create a branch** from `main`:
   \`\`\`bash
   git checkout -b feature/amazing-feature
   \`\`\`

3. **Make your changes**:
   - Follow the code style
   - Add tests for new features
   - Update documentation

4. **Run tests and checks**:
   \`\`\`bash
   npm run type-check
   npm run lint
   npm test
   \`\`\`

5. **Commit your changes**:
   \`\`\`bash
   git commit -m "feat: add amazing feature"
   \`\`\`

   Use conventional commits:
   - \`feat:\` - New feature
   - \`fix:\` - Bug fix
   - \`docs:\` - Documentation
   - \`style:\` - Code style
   - \`refactor:\` - Code refactoring
   - \`test:\` - Tests
   - \`chore:\` - Maintenance

6. **Push to your fork**:
   \`\`\`bash
   git push origin feature/amazing-feature
   \`\`\`

7. **Open a Pull Request**

## Development Setup

1. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Setup environment**:
   \`\`\`bash
   cp .env.example .env

   # Edit .env with your values

   \`\`\`

3. **Setup database**:
   \`\`\`bash
   npm run db:generate
   npm run db:migrate
   \`\`\`

4. **Start development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

## Coding Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define proper types (avoid \`any\`)

### React

- Use functional components with hooks
- Use \`"use client"\` directive when needed
- Keep components focused and small

### Naming Conventions

- **Components**: PascalCase (\`UserProfile.tsx\`)
- **Functions**: camelCase (\`getUserData\`)
- **Constants**: UPPER_SNAKE_CASE (\`MAX_RETRIES\`)
- **Files**: kebab-case (\`auth-context.tsx\`)

### File Structure

- Place tests next to code or in \`**tests**\`
- One component per file
- Group related files in folders

## Testing

### Writing Tests

\`\`\`typescript
import { render, screen } from "@testing-library/react";
import MyComponent from "./my-component";

describe("MyComponent", () => {
it("should render correctly", () => {
render(<MyComponent />);
expect(screen.getByText("Hello")).toBeInTheDocument();
});
});
\`\`\`

### Test Coverage

Aim for:

- **80%+** overall coverage
- **100%** for critical paths
- **All** new features tested

Run coverage:
\`\`\`bash
npm run test:coverage
\`\`\`

## Documentation

- Update README.md for new features
- Add JSDoc comments for complex functions
- Update API documentation
- Include examples

## Questions?

Feel free to ask questions in:

- GitHub Issues
- Pull Request comments
- Discussions

Thank you for contributing! 🙏
