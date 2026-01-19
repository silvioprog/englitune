#!/bin/sh

set -e

npx wrangler deploy --minify

echo "✅ Done"
