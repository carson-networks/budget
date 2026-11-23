import Domain
import SwiftUI

struct VersionView: View {
    let version = AppVersion.current

    var body: some View {
        VStack(spacing: 8) {
            Text(version.name)
                .font(.title)
            Text("Version \(version.displayString)")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    VersionView()
}
