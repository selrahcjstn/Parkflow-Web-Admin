# ParkFlow — Implementation Report

Date: 2026-10-28. Source: `C:/Users/Allen/Desktop/Python/campus-equipment-system/Audit_Report_v1.md`, with the subsequently confirmed business rules. Phases 1 and 2 are implemented. No dependencies installed, database migrations applied, or historical records deleted.

## Phase 1 — Completed

**Audit IDs:** A-I1, A-I2, M-I1. Implementation and focused automated checks completed; database/device verification limitations are listed below.

### Changes implemented

- Reactivation clears suspension transactionally and derives the valid status from existing verification evidence. Students require approved vehicle/driver documents, verified email and the existing account checks; incomplete verification restores `PendingVerification`. Personnel reuse an unchanged, current identity approval rather than receiving a new approval through unsuspension. Provisioned admin/guard roles retain their existing activation behavior. No previous-status field existed, so the approved verification-state fallback is used.
- `PUT /api/users/{id}/status` now returns `data: { id, status }`. Both admin consumers use this persisted status, including Pending Verification. Failed requests leave displayed status unchanged and show an error. Details reload from the API instead of stale browser navigation state. Existing authorization policy remains in place.
- Removed the second suspension badge from the detail hero, retaining its normal status display. Updated reactivation wording to explain pending verification.
- Reservation selection, confirmation, list and pass labels/icons now follow the actual vehicle type. Saved reservation type takes precedence over current vehicle data; unknown legacy data displays “Vehicle.” The mobile reservation contract now includes the API's existing `vehicleType` field. Enum values remain Motorcycle=0, ElectricBike=1, Car=2. The motorcycle-specific availability caption now uses the existing availability response for the selected vehicle type.

### Files changed

Paths below are relative to their project roots under `C:/Users/Allen/Desktop/`.

| Project | Files |
|---|---|
| ParkFlow-API | `ParkFlow.API/Controllers/UserAccountController.cs`; `ParkFlow.Application/Features/Users/Commands/UpdateUserStatus/UpdateUserStatusCommand.cs`, `UpdateUserStatusHandler.cs`; `ParkFlow.Application/Features/Verification/VerificationService.cs`; `ParkFlow.Application/Interfaces/IVerificationStore.cs`; `ParkFlow.Persistence/Repositories/VerificationStore.cs`; `Test/Features/Users/UpdateUserStatusTests.cs`; `Test/Features/Verification/VerificationStoreTests.cs` |
| Parkflow-Web-Admin | `src/features/users/pages/UsersPage.vue`, `UserDetailPage.vue`; `src/features/users/components/UserCard.vue`, `UserDetailHeroCard.vue`, `UserStatusModal.vue`; `src/features/users/services/userStatus.service.ts`; `tests/account-status.test.mjs`; this report |
| ParkFlow-Mobile-App | `constants/vehicleType.ts`; `features/account/pages/SchedulePage.tsx`; `features/schedule/pages/UserSchedulePage.tsx`; `features/schedule/types/reservation.types.ts`; `components/ui/VehicleTypeIcon.tsx`; `utils/reservationVehicle.ts`; `tests/reservation-vehicle-labels.test.mjs` |

### Verification actually executed

| Check | Actual result |
|---|---|
| API: `dotnet build ParkFlow.API/ParkFlow.API.csproj --no-restore --nologo -v minimal` | Passed; 0 warnings/errors. Subsequent targeted test command also rebuilt the final backend changes successfully. |
| API: `dotnet test Test/Test.csproj --no-restore --nologo --filter "FullyQualifiedName~UpdateUserStatusTests\|FullyQualifiedName~StudentRestorationPersists\|FullyQualifiedName~VerificationAuthorizationTests\|FullyQualifiedName~SuperAdminAuthorizationTests" -v minimal` | 29 passed, 1 skipped, 0 failed. Covers activation/pending decisions, no approval bypass, restoration failures, returned status and authorization. PostgreSQL persistence test skipped: `PARKFLOW_VERIFICATION_TEST_CONNECTION` is not configured. |
| Admin: `node --test tests/account-status.test.mjs tests/cache.test.mjs` | 15 passed. Includes actual status-handler execution with mocked requests, failure behavior, persisted-status consumption and cache checks. |
| Admin: `npm run build`; `npm run type-check` | Passed. Build emitted two annotation warnings in the installed SignalR dependency. Final type check passed after the last UI wording changes. |
| Mobile: `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| Mobile: `node --test tests/reservation-vehicle-labels.test.mjs tests/guard-reservations.test.mjs` | 12 passed. Covers enum stability, car/motorcycle labels and icons, saved-type precedence, unknown legacy values and existing reservation/capacity behavior. |
| Broader API verification-rules check | 28 passed, 2 failed, 1 skipped. Failures are existing COR assertions: “Academic year” versus “School year” wording, and an unset-policy expectation. Those tested COR paths were not modified. |
| Broader mobile verification-status check, alongside label/guard tests | 14 passed, 5 failed. Four title expectations require “Pending Review” but receive “COR Processing Pending”; one expects schedule approval to block access. The tested `hooks/useVerificationGuard.ts` and its tests were not modified. These failures remain unresolved in this phase. |
| Source/contract review | Reviewed modified files and direct consumers; only the two admin status consumers use the changed endpoint. No hardcoded Motorcycle labels/icons remain in the two affected reservation pages. Backend reservation DTO already supplies vehicle type. |

### Database requirements, unverified scenarios and risks

- No schema migration is required for Phase 1. The reactivation transaction uses the existing verification store and account lock. The new database regression test checks approved-to-Active and pending-to-Pending persistence across fresh contexts, but it was **not executed** without a disposable PostgreSQL connection.
- Live HTTP reactivation, real database refresh/persistence, personnel restoration and device-rendered car/motorcycle selection/pass layouts were not exercised. Mobile/native builds and end-to-end QR, parking and reservation flows were not run. Automated label tests use mocked rendering inputs; they are not device verification.
- Deploy API and admin changes together: the status endpoint's `data` changed from an ID string to `{ id, status }`. New admin code rejects the legacy response instead of guessing a status.
- The broader COR/verification test failures above remain. Their failing code paths are unchanged; no full-suite pass is claimed. An existing nullable warning appeared while compiling the backend test project during the broader run.

## Phase 2 — Completed

**Audit ID:** A-R4. Fee-free workflows are implemented; historical records and schema remain intact.

### Changes implemented

- Removed registered/manual/visitor checkout charge creation and fee computation. Registered checkout still completes reservations and saves exit timestamps atomically; visitor checkout retains status concurrency protection. Shared checkout timing preserves existing deadlines, exit grace and operational overstay hours.
- Removed unpaid-balance restrictions from QR/student scans, registered/manual entry, reservation creation and reservation scanning. Existing account/document, schedule, reservation, duplicate-session and capacity checks remain. Previously eligible unscheduled manual-entry exceptions no longer require fee acceptance; other schedule restrictions remain.
- Live session amounts and compatibility fee fields are zero; checkout settlement is `NotRequired`. Legacy fee modes/rates cannot re-enable charges. Monetary compatibility fields and no-op calculator signatures remain until Phase 3; their former calculation formulas are removed. Stored historical charge amounts are still returned by historical queries, without inventing fees for new sessions.
- Removed live fee estimates, notices, fee consent/retries and payment-based QR suppression from mobile. Removed admin rate controls and operational financial displays. Retained early-entry and exit-grace settings. Existing payment-history/Collections views remain for Phase 3; admin settlement controls are disabled and the payment endpoint now rejects mutations, keeping historical records read-only.

### Files changed

All paths are relative to the project roots identified in Phase 1.

| Project | Files / affected groups |
|---|---|
| API | `ParkFlow.API/Controllers/SystemSettingsController.cs`; `ParkFlow.Application/Common/SystemSettingsStore.cs`; `Features/History/Queries/GetParkingHistoryHandler.cs`; ParkingLogs command handlers `CreateParkingLog`, `CreateManualParkingLog`, `ExitParkingLog`, `ExitManualParkingLog`; DTOs `CreateParkingLogResponse`, `ExitParkingLogResponse`; query handlers `GetActiveParkingSession`, `GetActiveSessionByVehicleId`, `VerifyStudentScan`; services `ActiveSessionTiming`, `PersonnelParkingPolicy`, `ViolationService`; reservation handlers `CreateReservation`, `VerifyReservationScan`; violation handler `ProcessViolationPayment`; visitor handlers `CreateVisitorEntry`, `ExitVisitorSession`, `GetPlateLookup`; interfaces `IParkingLogRepository`, `IVisitorRepository`; persistence repositories `ParkingLogRepository`, `VisitorRepository`. Feature paths are under `ParkFlow.Application/Features/`. |
| API tests | Under `Test/Features/`: ParkingLogs `NoParkingFeesTests` (new), `EarlyStudentManualEntryTests`, `ExitManualParkingLogTests`, `GetSessionCountTests`, `PersonnelParkingPolicyTests`, `PersonnelSessionTests`, `VerifyStudentScanTests`; Reservations `CreateReservationRestrictionTests`; Visitors `VisitorChargePersistenceTests`, `VisitorEntryTests`; Vehicles `VehicleCommandTests`; Violations `ActiveViolationsTests`. Several changes only update repository test doubles for the charge-free persistence contract. |
| Admin | `src/features/parking/pages/ParkingPage.vue`, `ParkingSessionDetailPage.vue`; `src/features/settings/pages/SettingsPage.vue`; `src/features/settings/components/OverstayFeeCard.vue`; `src/features/violations/pages/ViolationsPage.vue`, `ViolationDetailPage.vue`; this report. |
| Mobile | `app/(guard)/manual-input.tsx`, `manual-pass.tsx`, `manual-exit.tsx`; `features/qr/pages/ScanConfirmedPage.tsx`, `ScanConflictPage.tsx`; `features/session/components/SessionDetailSheet.tsx`; `features/user/components/ActiveSessionTimer.tsx`, `QRCodeDisplay.tsx`; `features/violation/store/violation.store.ts`; `features/schedule/pages/UserSchedulePage.tsx`; `features/schedule/components/PersonnelParkingHours.tsx`; `features/account/pages/ScheduleSetupPage.tsx`; `features/account/components/schedule/ScheduleViewMode.tsx`; `tests/manual-entry-ui.test.mjs`, `manual-exit-charge.test.mjs`. |

### Verification actually executed

| Check | Actual result |
|---|---|
| API targeted `dotnet test Test/Test.csproj --no-restore` | **50 passed**, 0 failed/skipped. Filter covered `NoParkingFeesTests`, `ExitManualParkingLogTests`, `VisitorChargePersistenceTests`, `PersonnelParkingPolicyTests`, `EarlyStudentManualEntryTests`, visitor exit/historical payment cases and reservation creation with historical balances. Rebuilt all API projects successfully. |
| Coverage within those checks | Registered QR/manual and visitor checkout without charge creation; historical records not modified; visitor concurrent exit rejection; legacy rates unable to restore fees; entry/reservations with historical balances; document/schedule restrictions retained; Manila exit-grace boundary and overnight overstay tracking. Uses in-process handlers/repositories or recording contexts, not a live database. |
| API broader regression comparison | Committed Phase 1 API baseline `53f9866`, tested in an isolated temporary worktree: **74 passed / 56 failed**. Same affected class scope after Phase 2 plus new tests: **89 passed / 47 failed**, 136 total. Every remaining failed case also failed in that baseline; no newly failing case. Remaining failures include legacy paid-flow expectations, incomplete driver-document fixtures, count/staff assumptions and unsupported test-double operations. Existing nullable warning in `VerificationStoreTests.cs` remains. No full-suite pass claimed. |
| Mobile interaction/contracts | `node --test tests/manual-entry-ui.test.mjs tests/manual-exit-charge.test.mjs tests/manual-network.test.mjs tests/reservation-vehicle-labels.test.mjs`: **50 passed**. Updated fixture mocks for existing driver-document components. Covers confirmation/cancel/stale-plate/duplicate-submit handling, fee-free visitor/registered exit, no payment submission, transport failures and Phase 1 vehicle labels. Free exit events also bypass the legacy client charge/violation store without fetching historical balances. |
| Mobile type check | `node node_modules/typescript/bin/tsc --noEmit`: **passed**. |
| Admin build and core regression checks | `npm run build`: **passed**, including type checking. `node --test tests/account-status.test.mjs tests/cache.test.mjs`: **15 passed**. Build emitted installed-dependency warnings. |
| Additional admin verification-settings check | **15 passed / 2 failed** when combined with the core checks. The two failures expect three verification toggles in the unchanged `VerificationSettingsCard.vue`, which renders two; unrelated to fee/timing controls. |
| Source review | Reviewed affected files/direct consumers and checked for remaining operational charge creation or payment gates. No production parking/visitor/reservation handler creates a new charge. Whitespace checks passed, accounting for existing Windows line endings. |

### Database requirements, unverified scenarios and risks

- **No migration is required or applied in Phase 2.** No historical records were deleted, marked paid, waived or otherwise rewritten. Legacy entities/mappings remain for the separately approved Phase 3 deletion plan.
- Live database transactions, a running API with real authentication/QR hardware, device layouts and end-to-end capacity changes were **not executed**. The database recording-context tests validate intended writes/concurrency handling without connecting to a database. Native/Expo packaging was not run.
- Roll out the API, admin and mobile updates together. Older clients may still display historical balances or suppress QR display locally. Historical interfaces/endpoints remain pending Phase 3 removal, with payment mutation disabled now.
- The broader baseline failures above remain outside the passing focused checks. Phase 1's separately recorded verification-test limitations also remain.

## Phase 3 — Partial

**Audit IDs:** A-R1, A-R2; closes a remaining A-R4 feedback-invoice path. Application changes and migration preparation are implemented. Historical deletion awaits database verification and explicit approval.

**Local checkpoint before this phase:** API `e211efa`, admin `abf3f0f`, mobile `9645dc6` (Phase 2). Nothing pushed. Phase 3 changes remain uncommitted.

### Changes implemented / files changed

| Project | Files / affected groups and result |
|---|---|
| API | Removed `Controllers/ViolationController.cs`, `Features/Violations/`, `IViolationRepository`, persistence repository/configuration, domain `Violation` and settlement/type enums; removed `IViolationService`/`ViolationService` and DI/handler dependencies. Paths retain their project prefixes from Phase 2. |
| API | Updated parking/visitor entry, exit, lookup and active-session DTOs/consumers; removed compatibility amounts, settlement fields, fee-consent contracts and monetary settings. `Features/History/Queries/GetParkingHistoryHandler.cs` retains parking records and computes operational overstay using shared `ActiveSessionTiming`, batch schedules/reservations and exit grace. Special reservations retain their zero-overstay checkout behavior. Dashboard DTOs/repository no longer query financial totals. |
| API | Updated `Infrastructure/Services/NotificationService.cs`, `Persistence/Repositories/UserNotificationRepository.cs`, `UserAccountRepository.cs`; no financial event dispatch or violation dependency remains. Retired financial messages are hidden before pagination/unread counts, while operational exit notifications remain. |
| API | Removed optional fee-invoice creation from `Domain/Entities/Feedback.cs`, `Controllers/FeedbackController.cs`, reply command/handler and feedback DTO/history mapper. Feedback messages, replies, resolution and notifications remain. Added migration `20261027202102_RemovePaymentAndViolationHistory` (including designer/snapshot) and `docs/phase-3-deletion-plan.md`. |
| API tests | Adapted affected parking/reservation/visitor/dashboard constructors and contracts. Retired deleted-feature assertions and moved reused operational doubles to `Test/Support/ParkingTestDoubles.cs`. Added `RetiredFinancialFeaturesTests`; visitor persistence and reservation access tests now use operational names. |
| Admin | Removed `src/features/violations/`, Collections navigation/routes, report ledger and obsolete financial insights. Updated dashboard cards/recent activity, report metrics/CSV/print output, parking DTOs/details, notification store/dropdown, settings contracts and cache. Renamed `OverstayFeeCard.vue` to `ParkingTimingCard.vue`; early-entry and exit-grace controls remain. Removed feedback invoice DTO fields. Updated cache/dashboard tests; added operational CSV coverage. |
| Mobile | Removed violation/payment pages, routes, stores, receipt/settlement UI and API/SignalR consumers. Updated history page/store/service/details to parking-only, user/guard dashboards, QR/session/visitor contracts, auth cleanup, notifications/cache/preferences and related help copy. Removed feedback invoice card/DTO fields and obsolete financial types/formatter. Added `tests/retired-financial-features.test.mjs`; adapted affected dialog/button checks. |

### Verification actually executed

| Check | Actual result |
|---|---|
| API `dotnet test Test/Test.csproj --no-restore` with focused class/method filter | **64 passed**, 0 failed/skipped. Builds API and test projects. Covers registered/manual/visitor free checkout, visitor concurrent exit rejection, reservation/document validation, Manila exit-grace boundaries, retained history/timestamps, operational dashboard/notification queries, removal of financial contracts/endpoints, feedback replies, migration operations and snapshot consistency. Existing nullable warning in `VerificationStoreTests.cs:214` remains. |
| Broader API parking selection | **81 passed / 10 failed**, 91 total. All 10 failed test names also failed in the saved Phase 2 run. Failures cover three incomplete visitor entry fixtures, two reservation-message assertions and five existing personnel/timing assumptions. Two initially failing rewritten reservation-access fixtures were corrected to supply approved driver/vehicle documents and pass in the focused run. No full-suite pass claimed. |
| EF migration SQL generation | `dotnet ef migrations script 20261021104419_AddDriverDocumentsAndDurableSettings 20261027202102_RemovePaymentAndViolationHistory ...`: passed. Reviewed generated transaction, approval/FK/trigger guards, financial notification purge, one child-table drop and four invoice-column drops; no `CASCADE` or protected-table deletion. **Generated only; SQL was not executed.** |
| Admin build / regression checks | `npm run build`: passed (installed SignalR annotation warnings). Account-status, cache, dashboard/report and feedback-workflow Node suites: **35 passed**. Exercises operational metrics, CSV export and feedback actions without financial endpoints. |
| Mobile type / focused checks | `node node_modules/typescript/bin/tsc --noEmit`: passed. Manual-entry, manual-exit, network, vehicle-label and retired-financial-feature Node suites: **53 passed**. Covers parking history/pagination, filtered server/cached financial notifications and operational exit/reservation invalidation. |
| Additional mobile dialog/button suites | **29 passed / 4 failed**. Four failures reproduced using committed test versions against unchanged dependent components: one reservation callback fixture lacks `getActiveReservation`; three button expectations disagree with existing foreground/theme classes. Obsolete fee-consent/settlement tests were retired; no UI fixes outside this phase were made. |
| Source/contract review | No remaining live financial endpoints, charge/invoice creation, Collections/payment/violation screens or financial DTO consumers found. Retired-message filters and migration/history source retain identifying strings intentionally. Vehicle enum values, authentication, QR verification, reservations, capacity checks and early/exit-grace settings were preserved. |

### Database requirements, unverified scenarios and risks

- **No migration or historical deletion applied.** Prepared deletion removes `Violations`, four `Feedbacks.Invoice*` columns and clearly financial notifications; feedback rows/replies and all operational parking/account/visitor/vehicle/reservation records are retained. Prior migrations remain as schema history.
- Reviewed committed EF relationships: violations are children of parking logs/visitor sessions; notifications are children of accounts. Actual database catalog access was attempted but did not succeed. Live foreign keys, triggers, row counts, backup restoration and migration rehearsal remain required; the plan includes read-only inspection queries and protected-key comparisons.
- Startup currently auto-applies migrations through `SuperAdminSeeder`. The new migration **refuses execution without an explicit PostgreSQL session approval option**, and aborts on unexpected incoming financial FKs or custom notification triggers. A pending migration deliberately blocks startup. Coordinate deployment after target review, disposable rehearsal, verified backup and explicit irreversible-deletion approval. `Down` refuses to imply recovery of deleted history; restore the verified backup instead.
- Coordinated API/admin/mobile rollout is required: financial endpoints/fields and feedback invoice request fields are removed. Older clients may still call deleted endpoints or show cached financial UI.
- No live authenticated API, shared/production database, device/native build, deployed notification delivery, complete QR/reservation/entry/exit/capacity workflow or visual layout verification was executed. Early-entry changes and boundary checks are recorded separately in Phase 4 below.

## Phase 4 — Completed

**Audit ID:** A-R3. Configured early-entry grace is removed from application rules and both clients. Exit grace remains configurable and functional. Phase 3's destructive migration remains unapplied. Phase 4 changes are uncommitted; nothing was pushed.

### Changes implemented / files changed

| Project | Files / affected groups |
|---|---|
| API | `Common/SystemSettingsStore.cs`: removed early-entry properties, defaults, copying and update parameters. Legacy JSON properties are ignored; subsequent settings saves omit them. `ParkingLogs/Services/ScheduleService.cs`, `IScheduleService.cs`, `ReservationSessionWindow.cs`: schedule and normal-reservation entry windows start at their exact start time. `ParkingService.cs` / `IParkingService.cs`: removed the unused entry-grace calculation contract; exit-grace methods remain. Feature paths are under `ParkFlow.Application/Features/`. |
| API | Parking-log entry/manual-entry and student-scan handlers; reservation scan and cancellation handlers: removed early-minute subtraction. Cancellation closes at the exact normal reservation start; special-pass cancellation still closes at Manila midnight. Added optional built-in `TimeProvider` clocks for deterministic handler boundary tests, defaulting to system UTC. Removed misleading hardcoded “30m grace” entry-window text. |
| API | `ParkingTimeHelper.cs` now identifies `Asia/Manila` explicitly. Updated direct session-window consumers in `ActiveSessionTiming.cs`, active-session lookup and both exit handlers for the simplified contract. Updated affected parking-service/schedule test doubles and existing timing tests. Added `Test/Features/Reservations/NoEarlyEntryGraceTests.cs`. |
| Admin | `src/features/settings/pages/SettingsPage.vue`, `components/ParkingTimingCard.vue`: removed early-entry controls/defaults/contracts and labeled the retained control **Exit Grace Period**. Moved the affected settings render check from `tests/admin-ui.test.mjs` to isolated `tests/parking-timing.test.mjs`, covering enabled/disabled exit grace and retained staff time controls. |
| Mobile | `services/system-settings.service.ts`; `features/account/pages/ScheduleSetupPage.tsx`, `SchedulePage.old.tsx`; `features/account/components/schedule/ScheduleViewMode.tsx`; `features/schedule/pages/UserSchedulePage.tsx`; `features/qr/types/qr-scan.types.ts`: removed early-entry fields, badges, fallback minutes and obsolete QR type field. Retained exit-grace displays and schedule editing. Added `tests/parking-timing.test.mjs`. |

The separate guard-controlled manual student entry exception remains available as an unscheduled manual session. Staff/faculty access and special-pass same-day eligibility retain their existing policies. Vehicle enum values, QR verification, document checks, capacity validation, fee-free checkout and operational timestamps were preserved.

### Verification actually executed

| Check | Actual result |
|---|---|
| API focused `dotnet test Test/Test.csproj --no-restore` selection | **61 passed**, 0 failed/skipped, including **32 new boundary/contract cases**. Builds the API and test projects; the existing nullable warning at `VerificationStoreTests.cs:214` remains. |
| Boundary coverage | Actual reservation scan, reservation QR/vehicle QR entry, manual reservation entry, student scan and cancellation handlers with fixed clocks; one tick before/at/after start, inclusive end and one tick after end, Manila midnight, normal/special cancellation rules, exact class start, ignored legacy early-setting JSON and enabled/disabled exit grace. Existing fee-free registered/visitor exit and migration/contract tests also passed. These are in-process tests, without a running API/database. |
| Broader API selection | **118 passed / 27 failed**, 145 total, before the final disabled-exit-grace case was added. Seventeen failed names match failures in saved Phase 2/3 runs. Ten cases renamed during Phase 3 are not directly comparable by name; their observed failures involve incomplete driver-document fixtures or an entry/read-only double rejecting checkout. Remaining failures include visitor fixtures, reservation-message wording and older personnel/timing expectations. No full-suite pass or blanket regression-free claim. |
| Admin | `npm run build`: passed, including type checking, with existing installed SignalR annotation warnings. Account-status, cache, dashboard/report, feedback-workflow and parking-timing Node suites: **37 passed**. The original monolithic `admin-ui` module could not load because its existing capacity-component mock lacks `../types`; the relevant timing render test was isolated and passed. |
| Mobile | `node node_modules/typescript/bin/tsc --noEmit`: passed. Manual-entry/exit, network, vehicle-label, retired-financial-feature and parking-timing Node suites: **55 passed**. New render checks verify exit-grace enabled/disabled display and unchanged schedule-edit action, with legacy early-window values ignored. |
| Source/contracts | Reviewed changes against the pre-Phase-4 snapshot. No early-setting/override or entry-grace contract references remain in live API/admin/mobile code. Intentional legacy-input test strings remain. Exit-grace settings/calculations and Phase 3's no-charge model remain. |

### Database requirements, unverified scenarios and risks

- **No Phase 4 schema migration is required or applied.** Existing settings JSON may still contain retired keys until the next normal save; they cannot enable early entry. No parking, reservation, visitor or historical financial records were rewritten/deleted.
- **Pre-deployment review required for legacy early arrivals:** parking logs do not persist their reservation association or original timing policy. A session admitted before its reservation start under the former grace window will no longer match that reservation using the new strict window. Exit deadline selection/reservation completion and derived historical overstay can consequently differ. Identify and close affected active sessions under the previous release before rollout; review historical timing impact. No guessed associations or automatic data backfill were introduced. Multi-window schedule history has the same lack of stored policy/version information.
- No live database, authenticated HTTP/device/native build, deployed settings persistence, or real QR/capacity workflow was exercised. Full production rollout remains gated by Phase 3's backup/schema review and explicit destructive-deletion approval; its startup migration approval guard is unchanged.

## Remaining phases

| Phase | Audit IDs | Status | Files/changes | Migration requirements | Verification / remaining work |
|---|---|---|---|---|---|
| 2 — Remove all fees | A-R4 | Completed | See Phase 2 above | None; historical data preserved | Focused checks passed; live environment unverified. |
| 3 — Remove payment history and violations | A-R1, A-R2 | Partial | Application removals and guarded migration prepared; see above | Unapplied; live schema review, backup/rehearsal and explicit deletion approval required | Focused checks passed; baseline failures and live-environment limits recorded above. |
| 4 — Remove early-entry grace | A-R3 | Completed | See Phase 4 above | No schema change; legacy settings keys ignored | Focused checks passed; legacy early-session matching requires pre-deployment review. |
| 5 — Visitor/vehicle redesign | A-R5, A-R6 | Not Started | None | Preserve legacy associations while adding visitor vehicles and vehicle-linked sessions | Not executed; normalized-plate retrieval, independent sessions, concurrency and capacity remain for Phase 5. |

Stopped after Phase 4. Phase 5 requires the user's next approval. Historical deletion remains unapplied and requires separate approval after database verification; review the legacy timing risk above before any rollout.
