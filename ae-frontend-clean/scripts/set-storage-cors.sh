#!/usr/bin/env bash
set -euo pipefail

# Usage: BUCKET_NAME=my-bucket ./scripts/set-storage-cors.sh
# Or: ./scripts/set-storage-cors.sh my-bucket

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CORS_FILE="$SCRIPT_DIR/cors.json"

if [ "$#" -ge 1 ]; then
  BUCKET="$1"
elif [ -n "${BUCKET_NAME:-}" ]; then
  BUCKET="$BUCKET_NAME"
else
  echo "Usage: BUCKET_NAME=<your-bucket> $0 or $0 <your-bucket>"
  exit 1
fi

echo "Setting Storage CORS for bucket: $BUCKET using $CORS_FILE"

# Prefer gcloud if available with storage buckets update
if command -v gcloud >/dev/null 2>&1; then
  echo "Attempting with gcloud storage buckets update --cors-file"
  if gcloud storage buckets update "$BUCKET" --cors-file="$CORS_FILE" 2>/dev/null; then
    echo "✅ CORS updated with gcloud"
    exit 0
  else
    echo "gcloud failed or does not support --cors-file; falling back to gsutil"
  fi
fi

if command -v gsutil >/dev/null 2>&1; then
  echo "Using gsutil to set CORS"
  gsutil cors set "$CORS_FILE" "gs://$BUCKET"
  echo "✅ CORS updated with gsutil"
  exit 0
fi

echo "ERROR: Neither 'gcloud' nor 'gsutil' found in PATH. Install Google Cloud SDK or ensure gsutil is available."
exit 2
