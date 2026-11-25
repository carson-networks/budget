import Domain
import Foundation

// Names its stream so a token handed to the wrong history is rejected, as FinanceKit rejects foreign tokens.
struct FakeHistoryToken: Codable {
    let stream: String
    let position: Int

    static func read<Element>(
        _ steps: [WalletChanges<Element>],
        stream: String,
        since token: Data?
    ) throws -> ChangeSet<Element> {
        let position = try position(from: token, stream: stream, stepCount: steps.count)
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        let newToken = try encoder.encode(FakeHistoryToken(stream: stream, position: min(position + 1, steps.count)))
        guard position < steps.count else {
            return ChangeSet(newToken: newToken)
        }
        return steps[position].changeSet(newToken: newToken)
    }

    private static func position(from token: Data?, stream: String, stepCount: Int) throws -> Int {
        guard let token, !token.isEmpty else { return 0 }
        guard let decoded = try? JSONDecoder().decode(FakeHistoryToken.self, from: token),
            decoded.stream == stream,
            (0...stepCount).contains(decoded.position)
        else {
            throw FinanceDataError.invalidToken
        }
        return decoded.position
    }
}
