# Commit Message Guidelines

When creating commit messages, follow these rules:

1. **Format**: `type(scope): subject`

2. **Types**:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes (formatting, etc.)
   - `refactor`: Code refactoring
   - `perf`: Performance improvements
   - `test`: Test additions or changes
   - `build`: Build system changes
   - `ci`: CI/CD changes
   - `chore`: Other changes that don't modify src or test files

3. **Scope**: Optional, describes the affected area (e.g., auth, api, ui)

4. **Subject**:
   - Use imperative mood ("add" not "added")
   - Don't capitalize first letter
   - No period at the end
   - Max 72 characters

5. **Body** (optional):
   - Explain what and why, not how
   - Wrap at 72 characters
   - Separate from subject with blank line

6. **Footer** (optional):
   - Reference Linear tickets: `Linear: ZAR-123`
   - Breaking changes: `BREAKING CHANGE: description`

## Examples

```
feat(auth): add social login support

Implemented OAuth integration for Google and GitHub.
Users can now sign in using their social accounts.

Linear: ZAR-15
```

```
fix(api): resolve CORS issues in production

The API was rejecting requests from the production domain.
Updated CORS configuration to include production URL.

Linear: ZAR-42
```
