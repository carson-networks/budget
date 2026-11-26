import Foundation
import Observation
import SwiftData

@Model
final class StoredSyncLease {
    #Unique<StoredSyncLease>([\.key])

    var key: Int
    var owner: UUID
    var expiresAt: Date

    init(key: Int = 1, owner: UUID, expiresAt: Date) {
        self.key = key
        self.owner = owner
        self.expiresAt = expiresAt
    }
}

@Model
final class StoredToken {
    #Unique<StoredToken>([\.accountID])

    var accountID: UUID
    var accountToken: Data?
    var balanceToken: Data?
    var transactionToken: Data?
    var pendingFullResync: Bool
    var updatedAt: Date

    init(
        accountID: UUID,
        accountToken: Data?,
        balanceToken: Data?,
        transactionToken: Data?,
        pendingFullResync: Bool,
        updatedAt: Date
    ) {
        self.accountID = accountID
        self.accountToken = accountToken
        self.balanceToken = balanceToken
        self.transactionToken = transactionToken
        self.pendingFullResync = pendingFullResync
        self.updatedAt = updatedAt
    }
}

@Model
final class StoredSchedule {
    #Unique<StoredSchedule>([\.key])

    var key: Int
    var frequency: String
    var updatedAt: Date

    init(key: Int = 1, frequency: String, updatedAt: Date) {
        self.key = key
        self.frequency = frequency
        self.updatedAt = updatedAt
    }
}

@Model
final class StoredWakeLogEntry {
    #Unique<StoredWakeLogEntry>([\.entryID])

    var entryID: UUID
    var sequence: Int64
    var startedAt: Date
    var durationMilliseconds: Int64
    var trigger: String
    var dataTypesJSON: String
    var changeCount: Int64?
    var failure: String?

    init(
        entryID: UUID = UUID(),
        sequence: Int64,
        startedAt: Date,
        durationMilliseconds: Int64,
        trigger: String,
        dataTypesJSON: String,
        changeCount: Int64?,
        failure: String?
    ) {
        self.entryID = entryID
        self.sequence = sequence
        self.startedAt = startedAt
        self.durationMilliseconds = durationMilliseconds
        self.trigger = trigger
        self.dataTypesJSON = dataTypesJSON
        self.changeCount = changeCount
        self.failure = failure
    }
}
