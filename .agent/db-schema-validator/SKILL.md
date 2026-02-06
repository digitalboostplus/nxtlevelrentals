# Firestore Database Validator Skill

---
name: firestore-database-validator
description: Validates Firestore database structures, security rules, and configurations for compliance with best practices and internal policies.
---

## Overview

This skill ensures that all Firestore database configurations, security rules, and data model definitions comply with best practices and internal standards for scalability, security, and maintainability.

## Policies Enforced

### 1. Security Rules
- **Authentication Required**: No public read/write access without explicit approval
- **Granular Permissions**: Rules must specify read/write separately, not combined `allow read, write`
- **Field-Level Validation**: Rules should validate data types and required fields
- **No Wildcards in Production**: Avoid `allow read, write: if true` patterns

### 2. Collection Naming
- **snake_case Convention**: All collection names must use `snake_case` (e.g., `user_profiles`, `order_items`)
- **Plural Nouns**: Collections should be named as plural nouns (e.g., `users` not `user`)
- **No Special Characters**: Only lowercase letters and underscores allowed

### 3. Document Structure
- **Required Fields**: Every document should have `created_at` and `updated_at` timestamps
- **ID References**: Cross-references should use document ID strings, not nested documents
- **Array Limitations**: Arrays should not exceed 20 items for query efficiency
- **Map Depth**: Nested maps should not exceed 3 levels deep

### 4. Index Configuration
- **Composite Indexes**: Must be defined for queries with multiple `where` clauses or `orderBy`
- **No Redundant Indexes**: Single-field indexes are automatic; don't define them manually

### 5. Data Types
- **Timestamps**: Use Firestore `Timestamp` type, not ISO strings for dates
- **GeoPoints**: Use Firestore `GeoPoint` type for location data
- **References**: Use `DocumentReference` type for relations when appropriate

## File Types Validated

| File Type | Extension | Purpose |
|-----------|-----------|---------|
| Security Rules | `.rules`, `firestore.rules` | Access control definitions |
| Index Config | `firestore.indexes.json` | Composite index definitions |
| Schema Definitions | `.schema.json`, `.model.json` | Data model documentation |
| Migration Scripts | `.migration.js`, `.migration.ts` | Data migration validation |

## Instructions

### Step 1: Identify Files to Validate

Check the user's provided files or project structure for Firestore-related configurations:

```bash
# Find all Firestore-related files
find . -name "firestore.rules" -o -name "firestore.indexes.json" -o -name "*.schema.json" -o -name "*.rules"
```

### Step 2: Run the Validation Script

Use the validation script against the user's Firestore files:

```bash
# Validate security rules
python scripts/validate_firestore.py rules <path_to_rules_file>

# Validate index configuration
python scripts/validate_firestore.py indexes <path_to_indexes_file>

# Validate schema/model definitions
python scripts/validate_firestore.py schema <path_to_schema_file>

# Validate entire project
python scripts/validate_firestore.py project <path_to_firebase_project>
```

### Step 3: Interpret Output

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | All validations passed | Inform user configuration is compliant |
| 1 | Security rule violations | Report specific rule issues and suggest fixes |
| 2 | Naming convention violations | List non-compliant names with corrections |
| 3 | Structure violations | Detail structural issues and best practice alternatives |
| 4 | Index configuration issues | Explain missing or redundant indexes |

### Step 4: Generate Reports

For comprehensive validation, generate a detailed report:

```bash
python scripts/validate_firestore.py report <path_to_firebase_project> --output validation_report.md
```

## Common Issues and Fixes

### Issue: Overly Permissive Rules

❌ **Bad:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

✅ **Good:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Issue: Incorrect Collection Naming

❌ **Bad:** `UserProfiles`, `order-items`, `Products`

✅ **Good:** `user_profiles`, `order_items`, `products`

### Issue: Missing Timestamps

❌ **Bad:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

✅ **Good:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "Timestamp",
  "updated_at": "Timestamp"
}
```

### Issue: Deep Nesting

❌ **Bad:** Nesting data 5+ levels deep

✅ **Good:** Use subcollections or flatten structure to max 3 levels

## Integration with Firebase CLI

This skill works alongside Firebase CLI commands:

```bash
# Deploy rules after validation passes
firebase deploy --only firestore:rules

# Deploy indexes after validation passes
firebase deploy --only firestore:indexes
```

## Schema Definition Format

When documenting Firestore schemas, use this JSON format:

```json
{
  "collection": "users",
  "description": "User account information",
  "fields": {
    "id": { "type": "string", "required": true, "description": "Document ID (auto-generated)" },
    "email": { "type": "string", "required": true, "validation": "email format" },
    "display_name": { "type": "string", "required": true, "maxLength": 100 },
    "profile_image_url": { "type": "string", "required": false },
    "role": { "type": "string", "enum": ["user", "admin", "moderator"], "default": "user" },
    "created_at": { "type": "timestamp", "required": true },
    "updated_at": { "type": "timestamp", "required": true }
  },
  "subcollections": [
    {
      "name": "notifications",
      "description": "User notification history"
    }
  ],
  "indexes": [
    { "fields": ["role", "created_at"], "order": ["asc", "desc"] }
  ]
}
```

## Additional Resources

- [Firestore Security Rules Reference](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Data Modeling Guide](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)