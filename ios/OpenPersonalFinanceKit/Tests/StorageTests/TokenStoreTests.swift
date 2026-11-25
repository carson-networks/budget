import Domain
import Foundation
import Storage
import Testing

struct TokenStoreTests {
    private let directory: URL
    private let store: TokenStore
    private let card = UUID()
    private let savings = UUID()
    private let tokens = AccountTokens(
        accountToken: Data("a".utf8),
        balanceToken: Data("b".utf8),
        transactionToken: Data("t".utf8)
    )

    init() {
        directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        store = TokenStore(directory: AppGroupDirectory(url: directory))
    }

    private var file: URL { directory.appending(path: "tokens.json") }

    @Test func startsEmpty() async throws {
        #expect(try await store.tokens(for: card) == .empty)
    }

    @Test func savesPerAccountAndSurvivesANewInstance() async throws {
        try await store.save(tokens, for: card)
        try await store.save(AccountTokens(transactionToken: Data("s".utf8)), for: savings)

        let reopened = TokenStore(directory: AppGroupDirectory(url: directory))
        #expect(try await reopened.tokens(for: card) == tokens)
        #expect(try await reopened.tokens(for: savings) == AccountTokens(transactionToken: Data("s".utf8)))
    }

    @Test func overwritesAnAccountsTokens() async throws {
        try await store.save(tokens, for: card)
        try await store.save(AccountTokens(accountToken: Data("a2".utf8)), for: card)
        #expect(try await store.tokens(for: card) == AccountTokens(accountToken: Data("a2".utf8)))
    }

    @Test func removeAllClearsEveryAccount() async throws {
        try await store.save(tokens, for: card)
        try await store.save(tokens, for: savings)
        try await store.removeAll()
        try await store.removeAll()

        #expect(try await store.tokens(for: card) == .empty)
        #expect(try await store.tokens(for: savings) == .empty)
    }

    @Test(arguments: [
        "not json",
        #"{ "schemaVersion": 99, "accounts": {} }"#,
        #"{ "accounts": {} }"#,
        #"{ "schemaVersion": 1, "accounts": [1, 2] }"#,
    ])
    func clearsACorruptOrIncompatibleFile(contents: String) async throws {
        try await store.save(tokens, for: card)
        try Data(contents.utf8).write(to: file)

        #expect(try await store.tokens(for: card) == .empty)
        #expect(!FileManager.default.fileExists(atPath: file.path))

        try await store.save(tokens, for: savings)
        #expect(try await store.tokens(for: savings) == tokens)
        #expect(try await store.tokens(for: card) == .empty)
    }

    @Test func writesAVersionedEnvelope() async throws {
        try await store.save(tokens, for: card)
        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any]
        #expect(object?["schemaVersion"] as? Int == 1)
        #expect((object?["accounts"] as? [String: Any])?.keys.first == card.uuidString)
    }

    @Test func anUnreadableFileThrowsAndIsKept() async throws {
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: true)

        await #expect(throws: (any Error).self) { try await store.tokens(for: card) }
        await #expect(throws: (any Error).self) { try await store.save(tokens, for: card) }
        #expect(FileManager.default.fileExists(atPath: file.path))
    }
}
