#!/bin/sh
# Block dangerous shell commands
# Exit code 2 = block the action with message to stderr

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$COMMAND" ]; then
  exit 0
fi

case "$COMMAND" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf ."*)
    echo "BLOCKED: Dangerous recursive delete detected" >&2
    exit 2
    ;;
  *"--force"*push*|*push*"--force"*|*"push -f"*)
    echo "BLOCKED: Force push not allowed. Use regular push." >&2
    exit 2
    ;;
  *"reset --hard"*)
    echo "BLOCKED: Hard reset not allowed. Use soft reset or stash." >&2
    exit 2
    ;;
  *"drop database"*|*"DROP DATABASE"*|*"DROP TABLE"*|*"drop table"*)
    echo "BLOCKED: Database drop commands not allowed." >&2
    exit 2
    ;;
esac

exit 0
