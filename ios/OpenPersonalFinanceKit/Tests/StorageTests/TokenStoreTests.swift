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

    private var file: URL { directory.appending(path: "storage.sqlite") }

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

    @Test func markPendingFullResyncClearsTokensAndSavingNewTokensClearsFlag() async throws {
        try await store.save(tokens, for: card)
        try await store.save(tokens, for: savings)

        try await store.markPendingFullResync(for: card)
        let marked = try await store.tokens(for: card)
        #expect(marked == AccountTokens(pendingFullResync: true))
        #expect(!marked.hasSavedTokens)
        #expect(try await store.tokens(for: savings) == tokens)

        let replacement = AccountTokens(transactionToken: Data("fresh".utf8))
        try await store.save(replacement, for: card)
        let saved = try await store.tokens(for: card)
        #expect(saved == replacement)
        #expect(!saved.pendingFullResync)
    }

    @Test func removeAllClearsEveryAccount() async throws {
        try await store.save(tokens, for: card)
        try await store.save(tokens, for: savings)
        try await store.removeAll()
        try await store.removeAll()

        #expect(try await store.tokens(for: card) == .empty)
        #expect(try await store.tokens(for: savings) == .empty)
    }

    @Test func concurrentSavesAcrossTwoInstancesDoNotClobberOtherAccounts() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let appStore = TokenStore(container: StorageContainer(directory: appGroup))
        let deliveryStore = TokenStore(container: StorageContainer(directory: appGroup))
        let accountA = card
        let accountB = savings

        try await withThrowingTaskGroup { group in
            group.addTask {
                for iteration in 0..<25 {
                    try await appStore.save(
                        AccountTokens(transactionToken: Data("A-\(iteration)".utf8)),
                        for: accountA
                    )
                }
            }
            group.addTask {
                for iteration in 0..<25 {
                    try await deliveryStore.save(
                        AccountTokens(transactionToken: Data("B-\(iteration)".utf8)),
                        for: accountB
                    )
                }
            }
            try await group.waitForAll()
        }

        let reader = TokenStore(directory: appGroup)
        #expect(try await reader.tokens(for: accountA).transactionToken == Data("A-24".utf8))
        #expect(try await reader.tokens(for: accountB).transactionToken == Data("B-24".utf8))
    }

    @Test func historyTrackingRecordsTransactionsAcrossContainers() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let writerContainer = StorageContainer(directory: appGroup)
        let readerContainer = StorageContainer(directory: appGroup)
        let writerTokens = TokenStore(container: writerContainer)

        try await writerTokens.save(tokens, for: card)
        #expect(try readerContainer.historyTransactionCount() >= 1)
    }

    @Test func recoversFromCorruptDatabaseFile() async throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data("not a sqlite database".utf8).write(to: file)

        let freshStore = TokenStore(directory: AppGroupDirectory(url: directory))
        #expect(try await freshStore.tokens(for: card) == .empty)

        try await freshStore.save(tokens, for: savings)
        #expect(try await freshStore.tokens(for: savings) == tokens)
    }

    @Test func anUnreadableDirectoryAtStorePathThrowsAndIsKept() async throws {
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: true)

        await #expect(throws: (any Error).self) { try await store.tokens(for: card) }
        await #expect(throws: (any Error).self) { try await store.save(tokens, for: card) }
        #expect(FileManager.default.fileExists(atPath: file.path))
    }
}
