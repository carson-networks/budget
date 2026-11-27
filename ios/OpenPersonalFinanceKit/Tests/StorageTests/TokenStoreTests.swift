import Dispatch
import Domain
import Foundation
import Synchronization
import Testing

@testable import Storage

struct TokenStoreTests {
    private let directory: URL
    private let database: StorageDatabase
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
        database = StorageDatabase(directory: AppGroupDirectory(url: directory))
        store = TokenStore(database: database)
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

    @Test func listsAccountsWithSavedTokens() async throws {
        #expect(try await store.accountIDs().isEmpty)
        try await store.save(tokens, for: card)
        try await store.save(tokens, for: savings)
        try await store.save(tokens, for: card)

        #expect(try await store.accountIDs() == [card, savings].sorted { $0.uuidString < $1.uuidString })
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

    @Test func concurrentSavesAcrossTwoInstancesDoNotClobberOtherAccounts() async throws {
        let storeA = TokenStore(directory: AppGroupDirectory(url: directory))
        let storeB = TokenStore(directory: AppGroupDirectory(url: directory))

        try await withThrowingTaskGroup(of: Void.self) { group in
            for iteration in 0..<25 {
                group.addTask {
                    try await storeA.save(
                        AccountTokens(transactionToken: Data("card-\(iteration)".utf8)),
                        for: card
                    )
                }
                group.addTask {
                    try await storeB.save(
                        AccountTokens(transactionToken: Data("savings-\(iteration)".utf8)),
                        for: savings
                    )
                }
            }
            try await group.waitForAll()
        }

        let reopened = TokenStore(directory: AppGroupDirectory(url: directory))
        let cardToken = try await reopened.tokens(for: card).transactionToken
        let savingsToken = try await reopened.tokens(for: savings).transactionToken
        #expect(cardToken != nil)
        #expect(savingsToken != nil)
    }

    @Test func usesDeleteJournalModeWithoutLeftoverWalFiles() async throws {
        try await store.save(tokens, for: card)

        #expect(try database.journalMode()?.lowercased() == "delete")
        #expect(!FileManager.default.fileExists(atPath: "\(file.path)-wal"))
        #expect(!FileManager.default.fileExists(atPath: "\(file.path)-shm"))
    }

    @Test func recoversFromCorruptDatabaseOnColdOpen() async throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data("not a sqlite database".utf8).write(to: file)

        #expect(try await store.tokens(for: card) == .empty)

        try await store.save(tokens, for: savings)
        #expect(try await store.tokens(for: savings) == tokens)
        #expect(try await store.tokens(for: card) == .empty)
    }

    @Test func recoversFromCorruptDatabaseOnOpenStore() async throws {
        try await store.save(tokens, for: card)
        try Data("not a sqlite database".utf8).write(to: file)

        #expect(try await store.tokens(for: card) == .empty)

        try await store.save(tokens, for: savings)
        #expect(try await store.tokens(for: savings) == tokens)
        #expect(try await store.tokens(for: card) == .empty)
    }

    @Test func anUnreadableDirectoryAtStorePathThrowsAndIsKept() async throws {
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: true)

        await #expect(throws: (any Error).self) { try await store.tokens(for: card) }
        await #expect(throws: (any Error).self) { try await store.save(tokens, for: card) }
        #expect(FileManager.default.fileExists(atPath: file.path))
    }

    @Test func expiringActivityStillRunsWhenAssertionIsInitiallyExpired() async throws {
        let expirationNotified = Mutex(false)

        let value = try await ExpiringActivity.perform(
            reason: "test.initiallyExpired",
            onExpire: { expirationNotified.withLock { $0 = true } },
            runner: { _, block in block(true) }
        ) {
            "completed"
        }

        #expect(value == "completed")
        #expect(!expirationNotified.withLock { $0 })
    }

    @Test func expiringActivityNotifiesOnMidOperationExpiration() async throws {
        let started = DispatchSemaphore(value: 0)
        let allowFinish = DispatchSemaphore(value: 0)
        let expirationCount = Mutex(0)

        let value = try await ExpiringActivity.perform(
            reason: "test.midOperationExpiration",
            onExpire: {
                expirationCount.withLock { $0 += 1 }
                allowFinish.signal()
            },
            runner: { _, block in
                DispatchQueue.global().async { block(false) }
                DispatchQueue.global().async {
                    started.wait()
                    block(true)
                    block(true)
                }
            }
        ) {
            started.signal()
            allowFinish.wait()
            return "interrupted-cleanly"
        }

        #expect(value == "interrupted-cleanly")
        #expect(expirationCount.withLock { $0 } == 1)
    }
}
