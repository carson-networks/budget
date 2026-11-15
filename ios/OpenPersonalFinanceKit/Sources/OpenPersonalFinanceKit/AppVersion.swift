import Foundation

public struct AppVersion: Equatable, Sendable {
    public let name: String
    public let version: String
    public let build: String

    public init(infoDictionary: [String: Any]) {
        name =
            infoDictionary["CFBundleDisplayName"] as? String
            ?? infoDictionary["CFBundleName"] as? String
            ?? "OpenPersonalFinance"
        version = infoDictionary["CFBundleShortVersionString"] as? String ?? "?"
        build = infoDictionary["CFBundleVersion"] as? String ?? "?"
    }

    public static var current: AppVersion {
        AppVersion(infoDictionary: Bundle.main.infoDictionary ?? [:])
    }

    public var displayString: String {
        "\(version) (\(build))"
    }
}
