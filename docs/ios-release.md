# iOS releases

The **iOS Release** workflow (`.github/workflows/ios-release.yml`) builds the `OpenPersonalFinance` app and its `OpenPersonalFinanceDelivery` extension, signs them for the App Store, saves the IPA and debug symbols as workflow artifacts for 30 days, and uploads the IPA to App Store Connect for TestFlight.

The iOS app shares the web app's `vMAJOR.MINOR.PATCH` release tags. The workflow runs on every such tag, but a cheap first job compares the tag with the previous `v*` tag and skips the build unless something under `ios/` changed. It can also be dispatched by hand, which always builds.

It runs on GitHub's `xcode-27` runner with Xcode 27.2 selected, because the project uses Xcode 27's project format. That runner is a preview; switch to the GA label once GitHub publishes one.

[import-codesign-certs](https://github.com/Apple-Actions/import-codesign-certs) creates a temporary keychain and [upload-testflight-build](https://github.com/Apple-Actions/upload-testflight-build) does the upload. The project is archived with `xcodebuild archive` using manual signing passed on the command line, each target getting its own profile, and exported with `xcodebuild -exportArchive` using an `ExportOptions.plist` built from the profiles. Nothing in the project's signing settings changes; local builds keep automatic signing.

## One-time setup

The App IDs `net.carsonnetworks.OpenPersonalFinance` and `net.carsonnetworks.OpenPersonalFinance.Delivery` must exist in the Apple Developer team, both with the App Group `group.net.carsonnetworks.OpenPersonalFinance`, and the app record must exist in App Store Connect (plan task P0-H1). The app's App ID needs **FinanceKit**; the extension's gets it once Apple grants it (plan task P0-H4).

1. In **Certificates, Identifiers & Profiles**, create an **Apple Distribution** certificate if there isn't one, install it, and export it from Keychain Access as a `.p12` with a nonempty password.
2. Create two **App Store Connect** distribution profiles with that certificate: one for the app ID, one for the extension ID. Download both `.mobileprovision` files. If FinanceKit or the App Group was enabled on an App ID after a profile was made, regenerate the profile.
3. In App Store Connect → Users and Access → Integrations, create a **team API key** with the **App Manager** role and download `AuthKey_KEY_ID.p8`.
4. Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | `base64 -i distribution.p12 \| pbcopy` |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | The `.p12` export password |
| `IOS_APP_PROVISIONING_PROFILE_BASE64` | `base64 -i OpenPersonalFinance.mobileprovision \| pbcopy` |
| `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64` | `base64 -i OpenPersonalFinanceDelivery.mobileprovision \| pbcopy` |
| `APP_STORE_CONNECT_KEY_ID` | The API key's Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | The Issuer ID on the API keys page |
| `APP_STORE_CONNECT_PRIVATE_KEY` | `cat AuthKey_KEY_ID.p8 \| pbcopy`, pasted as-is including the BEGIN/END lines |

Never commit these files or their encoded contents. Renew the certificate and profile secrets before they expire.

Before building, the workflow checks that every secret is set, that each profile is for the right bundle ID and team and carries the App Group, and that the app's profile carries FinanceKit. A missing FinanceKit entitlement on the extension's profile is only a warning until `REQUIRE_EXTENSION_FINANCEKIT` is set to `true` in the workflow, which should happen when Apple grants it and the extension's profile is regenerated. It prints the signed entitlements of the archived app and extension in the **Show signed entitlements** step. Signing files and the temporary keychain are removed at the end of the job, even on failure.

## Release a version

Merge a PR that changes `ios/` into `master`. The **Release** workflow tags the merge (`v0.9.0`, say) with `RELEASE_PAT`, and that tag starts this workflow, which builds because `ios/` changed. Merges that only touch `docs/` are not released; merges that change only the web app are tagged but skip the iOS build.

To release by hand, run **Actions → Release → Run workflow** on `master`, or push a tag yourself:

```bash
git tag v0.9.0
git push origin v0.9.0
```

The tag sets the app version (`0.9.0`), so the app's version jumps whenever web-only releases happened in between; that is expected. Prerelease suffixes are rejected. The build number is `GITHUB_RUN_NUMBER.GITHUB_RUN_ATTEMPT`, so rerunning a failed run gives a new build number.

After the upload, check **App Store Connect → OpenPersonalFinance → TestFlight** for processing errors and make the build available to the internal testers. Uploading does not submit the app for review. If Apple rejects a processed build, fix it and push a new tag; if only the upload failed, rerun the workflow.

TestFlight builds expire after 90 days. Before then, merge an iOS change or dispatch this workflow by hand.

## Test a branch on devices

Once this workflow is on `master`, open **Actions → iOS Release → Run workflow**, pick the branch, and optionally enter a version. Without one, the project's `MARKETING_VERSION` is used.

```bash
gh workflow run ios-release.yml --ref your-branch
gh workflow run ios-release.yml --ref your-branch -f build_version=0.1.1
```

The job summary records the branch and commit that were built.
