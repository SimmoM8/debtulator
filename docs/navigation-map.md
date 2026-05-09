# Debtulator Navigation And User Flow Map

This file contains visual maps for both the navigation structure and the task-based user flow.

## Visual assets

### Navigation network

![Debtulator navigation network](./diagrams/navigation-network.svg)

### User flow network

![Debtulator user flow network](./diagrams/user-flow-network.svg)

## 1. Navigation map

```mermaid
flowchart TD
    root[Root stack] --> tabs[Tab shell /(tabs)]

    tabs --> home[Home /]
    tabs --> debts[Debts /debts]
    tabs --> members[Members /members]
    tabs --> events[Events /events]
    tabs --> requests[Requests /requests hidden tab]
    tabs --> settings[Settings /settings hidden tab]

    home --> debtForm[Debt form /debt/form]
    home --> paymentForm[Payment form /payment/form]
    home --> expenseForm[Expense form /expense/form]
    home --> memberForm[Member form /member/form]
    home --> inbox[Requests inbox /requests]
    home --> debts

    debts --> debtDetail[Debt detail /debt/[id]]
    debts --> paymentDetail[Payment detail /payment/[id]]
    debts --> paymentForm

    members --> memberForm
    members --> memberDetail[Member detail /member/[id]]

    events --> eventForm[Event form /event/form]
    events --> eventDetail[Event detail /event/[id]]
    eventDetail --> expenseForm
    eventDetail --> expenseDetail[Expense detail /expense/[id]]
    eventDetail --> attachmentDetail[Attachment detail /attachment/[id]]
    eventDetail --> settlementDetail[Settlement detail /settlement/[id]]

    settings --> auth[Auth /auth]
    settings --> language[Language /language]
    settings --> notifications[Notifications /notifications]
    settings --> privacy[Privacy /privacy]
    settings --> accessibility[Accessibility /accessibility]
    settings --> sync[Sync /sync]
    settings --> backup[Backup /backup]
    settings --> export[Export /export]
    settings --> conflicts[Conflicts /conflicts]
    settings --> deleteAccount[Delete account /delete-account]

    export --> fullExport[Full export /full-export]
    conflicts --> conflictDetail[Conflict detail /conflict/[id]]

    menu[Global menu] --> home
    menu --> debts
    menu --> members
    menu --> events
    menu --> requests
    menu --> recurring[Recurring /recurring]
    recurring --> recurringForm[Recurring form /recurring/form]
    menu --> analytics[Analytics /analytics]
    menu --> suggestions[Suggestions /suggestions]
    menu --> export
    menu --> importCsv[Import CSV /import-csv]
    menu --> sync
    menu --> conflicts
    menu --> backup
    menu --> privacy
    menu --> notifications
```

## 2. User flow map

```mermaid
flowchart TD
    launch[Launch app] --> dashboard[Open home dashboard]

    dashboard --> local[Continue in local-only mode]
    dashboard --> auth[Sign in or create account]
    auth --> shared[Shared and authenticated mode]
    auth --> dashboard

    dashboard --> addDebt[Create debt]
    addDebt --> debtDetail[Review debt detail]
    debtDetail --> recordPayment[Record payment]
    recordPayment --> debtState[Debt updated or settled]
    debtState --> dashboard

    dashboard --> addMember[Add member]
    addMember --> memberDetail[Review member detail]
    memberDetail --> linkMember[Link shared identity later]
    linkMember --> requests[Requests inbox]

    dashboard --> addEvent[Create event]
    addEvent --> eventDetail[Review event detail]
    eventDetail --> addExpense[Add expense or obligation]
    addExpense --> balances[Updated event balances]
    balances --> settlement[Review settlement detail]
    eventDetail --> attachments[Open attachment detail]

    shared --> requests
    requests --> approve[Accept or reject invite verification or link]
    approve --> memberDetail
    approve --> debtDetail
    approve --> eventDetail

    shared --> sync[Check sync status]
    sync --> healthy[Queue healthy]
    sync --> conflict[Conflict detected]
    conflict --> resolve[Review conflict detail]
    resolve --> sync

    dashboard --> tools[Open tools and safety flows]
    tools --> analytics[Review analytics]
    tools --> suggestions[Review suggestions]
    tools --> recurring[Manage recurring templates]
    tools --> export[Export data]
    tools --> backup[Backup or restore]
    tools --> importCsv[Import CSV]
    tools --> privacy[Review privacy settings]
    tools --> notifications[Adjust notification settings]
    tools --> deleteAccount[Delete account flow]

    local --> dashboard
    healthy --> dashboard
    analytics --> dashboard
    suggestions --> dashboard
    recurring --> dashboard
    export --> dashboard
    backup --> dashboard
    importCsv --> dashboard
    privacy --> dashboard
    notifications --> dashboard
    deleteAccount --> dashboard
```

## Reading the diagrams

- The navigation map shows route accessibility and entry surfaces.
- The user flow map shows the main intent loops and exception paths.
- `Requests`, `Sync`, and `Conflicts` are the main collaboration and integrity control points.
- `Settings` and the global menu expose most trust and maintenance workflows that are intentionally kept outside the four primary browse tabs.
- The SVG diagrams above are the persisted visual deliverables; the Mermaid blocks below remain editable source views.
