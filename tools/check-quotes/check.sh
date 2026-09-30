#!/bin/sh
# Checks every line in candidates.json against the book texts and rebuilds ../../quotes.json.
# Run fetch_texts.sh once first. A line that is not found word for word is left out and reported.
set -e
cd "$(dirname "$0")/texts"
python3 ../build_quotes.py
python3 ../assemble.py
cp quotes.json ../../../quotes.json
echo "quotes.json updated"
