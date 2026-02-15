#!/bin/sh
# Auto-format TypeScript/JavaScript files after edit
# Runs only if prettier is available

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json)
    if command -v npx >/dev/null 2>&1; then
      npx --yes prettier --write "$FILE_PATH" 2>/dev/null
    fi
    ;;
esac

exit 0
