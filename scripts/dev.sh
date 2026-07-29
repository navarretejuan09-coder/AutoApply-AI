#!/usr/bin/env bash
set -euo pipefail

pnpm turbo run dev --filter=@autoapply/web --filter=@autoapply/api --filter=@autoapply/worker --filter=@autoapply/browser
