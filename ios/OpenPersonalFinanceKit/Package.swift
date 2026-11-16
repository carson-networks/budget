// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "OpenPersonalFinanceKit",
    platforms: [.iOS("27.0")],
    products: [
        .library(name: "OpenPersonalFinanceKit", targets: ["OpenPersonalFinanceKit"])
    ],
    targets: [
        .target(name: "OpenPersonalFinanceKit"),
        .testTarget(name: "OpenPersonalFinanceKitTests", dependencies: ["OpenPersonalFinanceKit"]),
    ]
)
