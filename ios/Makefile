.PHONY: help format lint test build

SHELL := /bin/bash

PROJECT := OpenPersonalFinance.xcodeproj
SCHEME := OpenPersonalFinance
# First available iPhone on an iOS 27 runtime; device names differ between Macs and CI. 
SIMULATOR_ID ?= $(shell xcrun simctl list devices available | awk '/^-- iOS 27/{ok=1; next} /^--/{ok=0} ok && /iPhone/' | grep -m1 -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}')
SOURCES := OpenPersonalFinance OpenPersonalFinanceDelivery OpenPersonalFinanceKit
WORKFLOWS := ../.github/workflows/ios.yml ../.github/workflows/ios-release.yml
# Zero-warning gate on xcodebuild output, for warnings compiler flags can't promote (linker, assets, build system).
# appintentsmetadataprocessor warns on every target that doesn't link AppIntents, and no setting silences it.
CHECK_WARNINGS := awk '{ print } /warning:/ && !/no AppIntents.framework dependency found/ && !seen[$$0]++ { w[++n] = $$0 } \
	END { if (n) { print "\nZero-warning policy: " n " warning(s):"; for (i = 1; i <= n; i++) print w[i]; exit 1 } }'

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

format: ## Format Swift sources in place
	xcrun swift-format format --in-place --recursive --parallel $(SOURCES)

lint: ## Check Swift formatting, import boundaries and the iOS workflows
	xcrun swift-format lint --strict --recursive --parallel $(SOURCES)
	ast-grep scan --error $(SOURCES)
	actionlint $(wildcard $(WORKFLOWS))

build: ## Build the app for the Simulator
	set -o pipefail; xcodebuild build -project $(PROJECT) -scheme $(SCHEME) -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO 2>&1 | $(CHECK_WARNINGS)

test: build ## Build the app, then run the package tests on an iOS Simulator
	@test -n "$(SIMULATOR_ID)" || { echo 'no iOS 27 iPhone simulator found'; exit 1; }
	set -o pipefail; cd OpenPersonalFinanceKit && xcodebuild test -scheme OpenPersonalFinanceKit-Package -destination 'id=$(SIMULATOR_ID)' 2>&1 | $(CHECK_WARNINGS)
