// swift-tools-version: 6.4
import PackageDescription

let commonSwiftSettings: [SwiftSetting] = [
    .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
    .enableUpcomingFeature("InferIsolatedConformances"),
    .enableUpcomingFeature("MemberImportVisibility"),
    .treatAllWarnings(as: .error),
]

let nonisolatedSwiftSettings: [SwiftSetting] =
    commonSwiftSettings + [
        .defaultIsolation(nil)
    ]

let mainActorSwiftSettings: [SwiftSetting] =
    commonSwiftSettings + [
        .defaultIsolation(MainActor.self)
    ]

let package = Package(
    name: "OpenPersonalFinanceKit",
    platforms: [.iOS(.v27)],
    products: [
        .library(name: "Features", targets: ["Features"]),
        .library(name: "Live", targets: ["Live"]),
        .library(name: "Fakes", targets: ["Fakes"]),
    ],
    targets: [
        .target(
            name: "Domain",
            swiftSettings: nonisolatedSwiftSettings
        ),
        .target(
            name: "FinanceKitSource",
            dependencies: ["Domain"],
            swiftSettings: nonisolatedSwiftSettings
        ),
        .target(
            name: "BudgetClient",
            dependencies: ["Domain"],
            swiftSettings: nonisolatedSwiftSettings
        ),
        .target(
            name: "Storage",
            dependencies: ["Domain"],
            swiftSettings: nonisolatedSwiftSettings
        ),
        .target(
            name: "Sync",
            dependencies: ["Domain", "Storage"],
            swiftSettings: nonisolatedSwiftSettings
        ),
        .target(
            name: "Live",
            dependencies: ["Domain", "Sync", "Storage", "FinanceKitSource", "BudgetClient"],
            swiftSettings: nonisolatedSwiftSettings
        ),
        .target(
            name: "Features",
            dependencies: ["Domain"],
            swiftSettings: mainActorSwiftSettings
        ),
        .target(
            name: "Fakes",
            dependencies: ["Domain"],
            swiftSettings: nonisolatedSwiftSettings
        ),
        .testTarget(
            name: "DomainTests",
            dependencies: ["Domain"],
            swiftSettings: nonisolatedSwiftSettings
        ),
    ]
)
