#!/usr/bin/env bash
# Auto-commit + push à chaque fin de tâche de Claude Code (hook Stop).
# Ne fait rien s'il n'y a aucun changement. N'échoue jamais la session.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Rien à committer ?
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

git add -A
git commit -m "auto: $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push >/dev/null 2>&1

exit 0
