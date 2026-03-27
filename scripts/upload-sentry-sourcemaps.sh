#!/bin/sh

set -eu

PROJECT_NAME="${1:?Missing Sentry project name}"
BUILD_DIR="${2:?Missing build directory}"

if [ ! -d "${BUILD_DIR}" ]; then
  echo "Sentry sourcemaps skipped: build directory not found (${BUILD_DIR})."
  exit 0
fi

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "Sentry sourcemaps skipped: SENTRY_AUTH_TOKEN is not set."
  exit 0
fi

pnpm exec sentry-cli sourcemaps inject --org biyemassi --project "${PROJECT_NAME}" "${BUILD_DIR}"
pnpm exec sentry-cli sourcemaps upload --org biyemassi --project "${PROJECT_NAME}" "${BUILD_DIR}"
