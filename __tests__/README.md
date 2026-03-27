# Spendify Integration Tests

## Overview
Comprehensive integration test suite for the Spendify expense tracking application. These tests verify that all essential features work correctly end-to-end.

## Test Coverage

### 🔐 Authentication (`auth.test.ts`)
- User signup with validation
- User login with credentials
- Session persistence
- Secure storage integration

### 💰 Expense Management (`expenses.test.ts`)
- Create, read, update, delete expenses
- Expense aggregation by category
- Monthly expense totals
- Payment method handling

### 📁 Category Management (`categories.test.ts`)
- Create and manage categories
- Category persistence
- Secure storage integration
- Category deletion with cascade

### 🔄 Recurring Expenses (`recurringExpenses.test.ts`)
- Daily, weekly, monthly, yearly frequencies
- Next due date calculation
- Auto-expense generation
- Active/inactive status management

### 💸 Lending & Borrowing (`transactions.test.ts`)
- Add lending/borrowing transactions
- Fetch and filter transactions
- Delete transactions
- Calculate totals

### 📊 Budget Management (`budget.test.ts`)
- Set and update budgets
- Fetch budget information
- Budget persistence
- Validation

### 👤 Account Management (`account.test.ts`)
- Fetch user profile
- Update profile information
- Change password
- Delete account with data cleanup
- Logout functionality

### 🔗 End-to-End Workflows (`e2e.test.ts`)
- Complete user journey
- Recurring expense automation
- Budget tracking workflow
- Multi-device sync
- Data export

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Authentication tests
npm test auth.test.ts

# Expense tests
npm test expenses.test.ts

# Recurring expenses
npm test recurringExpenses.test.ts

# End-to-end tests
npm test e2e.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

## Test Structure

```
__tests__/
├── setup.ts                    # Global test setup and mocks
├── helpers/
│   └── testUtils.ts           # Test utilities and mock data generators
└── integration/
    ├── auth.test.ts           # Authentication tests
    ├── expenses.test.ts       # Expense management tests
    ├── categories.test.ts     # Category management tests
    ├── recurringExpenses.test.ts  # Recurring expense tests
    ├── transactions.test.ts   # Lending/borrowing tests
    ├── budget.test.ts         # Budget management tests
    ├── account.test.ts        # Account management tests
    └── e2e.test.ts           # End-to-end workflow tests
```

## Mocked Dependencies

The test suite mocks the following dependencies:
- **AsyncStorage** - Local storage for offline data
- **Expo SecureStore** - Secure credential storage
- **Supabase Client** - Database and authentication
- **Expo Haptics** - Haptic feedback
- **Expo AV** - Audio playback
- **Expo Router** - Navigation
- **NetInfo** - Network connectivity

## Test Data

Mock data generators are available in `__tests__/helpers/testUtils.ts`:
- `mockUser` - Test user data
- `mockCategory` - Category generator
- `mockExpense` - Expense generator
- `mockRecurringExpense` - Recurring expense generator
- `mockTransaction` - Transaction generator

## Assertions

Custom assertion helpers:
- `expectValidExpense(expense)` - Validates expense structure
- `expectValidCategory(category)` - Validates category structure
- `expectValidRecurringExpense(expense)` - Validates recurring expense

## Date Utilities

Helper functions for date manipulation:
- `formatDate(date)` - Format date as YYYY-MM-DD
- `addDays(date, days)` - Add days to date
- `addMonths(date, months)` - Add months to date
- `getFirstDayOfMonth(date)` - Get first day of month
- `getLastDayOfMonth(date)` - Get last day of month

## Troubleshooting

### Tests Failing Due to Mocks
- Check that all Supabase calls are properly mocked
- Verify AsyncStorage and SecureStore mocks are set up
- Ensure mock data matches expected structure

### Timeout Errors
- Increase Jest timeout in test file: `jest.setTimeout(10000)`
- Check for unresolved promises
- Verify async/await usage

### Import Errors
- Ensure all paths use correct aliases (`@/`)
- Check that TypeScript is configured correctly
- Verify module name mappings in `jest.config.js`

## Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Use `beforeEach` to reset mocks
3. **Descriptive Names** - Use clear test descriptions
4. **Arrange-Act-Assert** - Follow AAA pattern
5. **Mock Minimally** - Only mock external dependencies

## Contributing

When adding new features:
1. Add corresponding integration tests
2. Update this README with new test coverage
3. Ensure all tests pass before committing
4. Maintain >70% code coverage

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:
```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test -- --ci --coverage
```

## Support

For issues or questions about the test suite, please refer to:
- Jest documentation: https://jestjs.io/
- React Native Testing: https://reactnative.dev/docs/testing-overview
- Expo Testing: https://docs.expo.dev/develop/unit-testing/
