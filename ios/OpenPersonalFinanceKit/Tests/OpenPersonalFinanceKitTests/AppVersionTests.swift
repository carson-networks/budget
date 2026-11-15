import Testing

@testable import OpenPersonalFinanceKit

struct AppVersionTests {
    @Test func readsVersionAndBuild() {
        let version = AppVersion(infoDictionary: [
            "CFBundleName": "OpenPersonalFinance",
            "CFBundleShortVersionString": "0.1.0",
            "CFBundleVersion": "12.1",
        ])
        #expect(version.name == "OpenPersonalFinance")
        #expect(version.displayString == "0.1.0 (12.1)")
    }

    @Test func prefersDisplayName() {
        let version = AppVersion(infoDictionary: [
            "CFBundleDisplayName": "Open Personal Finance",
            "CFBundleName": "OpenPersonalFinance",
        ])
        #expect(version.name == "Open Personal Finance")
    }

    @Test func fallsBackWhenKeysAreMissing() {
        let version = AppVersion(infoDictionary: [:])
        #expect(version.name == "OpenPersonalFinance")
        #expect(version.displayString == "? (?)")
    }
}
