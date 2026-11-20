import os

nonisolated enum Log {
    static let logger = Logger(
        subsystem: "net.carsonnetworks.OpenPersonalFinance",
        category: "Features"
    )
}
