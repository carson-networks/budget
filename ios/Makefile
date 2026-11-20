.PHONY: help format lint test build

PROJECT := OpenPersonalFinance.xcodeproj
SCHEME := OpenPersonalFinance
# First available iPhone on an iOS 27 runtime; device names differ between Macs and CI. 
SIMULATOR_ID ?= $(shell xcrun simctl list devices available | awk '/^-- iOS 27/{ok=1; next} /^--/{ok=0} ok && /iPhone/' | grep -m1 -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}')
SOURCES := OpenPersonalFinance OpenPersonalFinanceDelivery OpenPersonalFinanceKit
WORKFLOWS := ../.github/workflows/ios.yml ../.github/workflows/ios-release.yml

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

format: ## Format Swift sources in place
	xcrun swift-format format --in-place --recursive --parallel $(SOURCES)

lint: ## Check Swift formatting, import boundaries and the iOS workflows
	xcrun swift-format lint --strict --recursive --parallel $(SOURCES)
	@bad="$$(find $(SOURCES) -name '*.swift' \
		! -path '*/.build/*' \
		! -path 'OpenPersonalFinanceKit/Sources/FinanceKitSource/*' \
		! -path 'OpenPersonalFinanceDelivery/OpenPersonalFinanceDelivery.swift' \
		-exec grep -HnE '^[[:space:]]*(@[[:alnum:]_]+[[:space:]]+)*((public|package|internal|fileprivate|private)[[:space:]]+)?import[[:space:]]+((typealias|struct|class|enum|protocol|let|var|func)[[:space:]]+)?FinanceKit(UI)?([[:space:].;]|$$)' {} + || true)"; \
	if [ -n "$$bad" ]; then \
		echo "FinanceKit may only be imported in FinanceKitSource and OpenPersonalFinanceDelivery.swift:"; \
		echo "$$bad"; \
		exit 1; \
	fi
	actionlint $(wildcard $(WORKFLOWS))

build: ## Build the app for the Simulator
	xcodebuild build -project $(PROJECT) -scheme $(SCHEME) -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO

test: build ## Build the app, then run the package tests on an iOS Simulator
	@test -n "$(SIMULATOR_ID)" || { echo 'no iOS 27 iPhone simulator found'; exit 1; }
	cd OpenPersonalFinanceKit && xcodebuild test -scheme OpenPersonalFinanceKit-Package -destination 'id=$(SIMULATOR_ID)'
