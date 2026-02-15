#!/bin/sh
# Block edits to files containing secrets
# Exit code 2 = block the action with message to stderr

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.env|*.env.*|*credentials*|*secret*|*.pem|*.key|*id_rsa*)
    echo "BLOCKED: Cannot edit sensitive file: $FILE_PATH" >&2
    exit 2
    ;;
esac

exit 0
