#!/usr/bin/env sh

# Template taken from
# https://www.abgeo.dev/blog/dynamic-environment-variables-dockerized-nextjs/

set -e

# Measure time taken to perform the search and replace operation
START_TIME=$(date +%s%3N)

# Iterate through environment variables that start with NEXT_PUBLIC_ and replace placeholders.
printenv | grep -E '^NEXT_PUBLIC_' | while read -r ENV_LINE; do
  # Separate the key and value parts from the found lines.
  ENV_KEY=$(echo "$ENV_LINE" | cut -d "=" -f1)
  ENV_VALUE=$(echo "$ENV_LINE" | cut -d "=" -f2-)

  # Escape forward slashes and ampersands for sed
  ESCAPED_VALUE=$(printf '%s\n' "$ENV_VALUE" | sed -e 's/[\/&\\]/\\&/g')

  # Debug: Show which env variable we're replacing
  echo "Replacing placeholder for: ${ENV_KEY}"

  # Find all instances of the placeholder and replace them with actual values
  find /app -type f ! -path "/app/node_modules/*" | while read -r FILE; do
    if grep -q "_${ENV_KEY}_" "$FILE"; then
      echo "Modifying file: $FILE"
      grep -n "_${ENV_KEY}_" "$FILE" | cut -c1-120
      sed -i "s|_${ENV_KEY}_|${ESCAPED_VALUE}|g" "$FILE"
    fi
  done
done

# End the timer and calculate elapsed time.
END_TIME=$(date +%s%3N)
ELAPSED_TIME=$((END_TIME - START_TIME))

echo "Entrypoint script executed in ${ELAPSED_TIME} ms"

# Drop write permissions for everything else except the cache directory
chmod -R u-w /app
chmod -R u+w /app/.next/cache

# Execute the application main command (Next.js).
echo "Starting the Nextjs application..."
exec "$@"