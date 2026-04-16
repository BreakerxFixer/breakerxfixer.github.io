#!/usr/bin/env bash
set -euo pipefail

mkdir -p reports
echo "automation-ok" > reports/status.txt
sha256sum reports/status.txt > reports/status.sha256
echo "BASH_AUTOMATION_DONE"
