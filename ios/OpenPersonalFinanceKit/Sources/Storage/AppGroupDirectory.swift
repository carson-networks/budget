import Foundation
import os

package struct AppGroupDirectory: Sendable {
    private static let identifier = "group.net.carsonnetworks.OpenPersonalFinance"

    private let url: URL

    package init(url: URL) {
        self.url = url
    }

    // Falls back to Application Support when the App Group entitlement is missing, as in an unsigned build.
    package static func live() -> AppGroupDirectory {
        if let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) {
            return AppGroupDirectory(url: container)
        }
        Log.logger.error("App Group container unavailable; using Application Support")
        return AppGroupDirectory(url: .applicationSupportDirectory)
    }

    var databaseFile: URL {
        url.appending(path: "storage.sqlite")
    }
}
