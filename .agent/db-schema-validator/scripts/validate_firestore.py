#!/usr/bin/env python3
"""
Firestore Database Validator
Validates Firestore security rules, indexes, and schema definitions
against internal best practices and policies.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Exit codes
EXIT_SUCCESS = 0
EXIT_SECURITY_VIOLATION = 1
EXIT_NAMING_VIOLATION = 2
EXIT_STRUCTURE_VIOLATION = 3
EXIT_INDEX_VIOLATION = 4


class ValidationError:
    def __init__(self, code: int, message: str, line: Optional[int] = None, suggestion: Optional[str] = None):
        self.code = code
        self.message = message
        self.line = line
        self.suggestion = suggestion

    def __str__(self):
        loc = f" (line {self.line})" if self.line else ""
        sug = f"\n  → Suggestion: {self.suggestion}" if self.suggestion else ""
        return f"[ERROR]{loc} {self.message}{sug}"


class FirestoreValidator:
    def __init__(self):
        self.errors: List[ValidationError] = []
        self.warnings: List[str] = []

    def validate_rules(self, filepath: str) -> int:
        """Validate Firestore security rules file."""
        if not os.path.exists(filepath):
            print(f"Error: File not found: {filepath}")
            return EXIT_SECURITY_VIOLATION

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')

        # Check for overly permissive rules
        self._check_permissive_rules(content, lines)
        
        # Check for combined read/write permissions
        self._check_combined_permissions(content, lines)
        
        # Check for missing authentication
        self._check_auth_requirements(content, lines)
        
        # Check for wildcard matches without restrictions
        self._check_wildcard_matches(content, lines)

        return self._report_errors()

    def validate_indexes(self, filepath: str) -> int:
        """Validate Firestore indexes configuration."""
        if not os.path.exists(filepath):
            print(f"Error: File not found: {filepath}")
            return EXIT_INDEX_VIOLATION

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(ValidationError(
                EXIT_INDEX_VIOLATION,
                f"Invalid JSON in indexes file: {e}"
            ))
            return self._report_errors()

        indexes = config.get('indexes', [])
        
        # Check for redundant single-field indexes
        self._check_redundant_indexes(indexes)
        
        # Check for missing collection references
        self._check_index_collections(indexes)

        return self._report_errors()

    def validate_schema(self, filepath: str) -> int:
        """Validate Firestore schema/model definition."""
        if not os.path.exists(filepath):
            print(f"Error: File not found: {filepath}")
            return EXIT_STRUCTURE_VIOLATION

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                schema = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(ValidationError(
                EXIT_STRUCTURE_VIOLATION,
                f"Invalid JSON in schema file: {e}"
            ))
            return self._report_errors()

        # Validate collection naming
        self._check_collection_naming(schema)
        
        # Check for required timestamp fields
        self._check_timestamp_fields(schema)
        
        # Check for deep nesting
        self._check_nesting_depth(schema)
        
        # Validate field types
        self._check_field_types(schema)

        return self._report_errors()

    def validate_project(self, project_path: str) -> int:
        """Validate entire Firebase project structure."""
        project = Path(project_path)
        max_exit_code = EXIT_SUCCESS

        # Check for firestore.rules
        rules_file = project / 'firestore.rules'
        if rules_file.exists():
            print(f"\n📋 Validating security rules: {rules_file}")
            code = self.validate_rules(str(rules_file))
            max_exit_code = max(max_exit_code, code)
            self.errors.clear()

        # Check for firestore.indexes.json
        indexes_file = project / 'firestore.indexes.json'
        if indexes_file.exists():
            print(f"\n📋 Validating indexes: {indexes_file}")
            code = self.validate_indexes(str(indexes_file))
            max_exit_code = max(max_exit_code, code)
            self.errors.clear()

        # Check for schema files
        for schema_file in project.glob('**/*.schema.json'):
            print(f"\n📋 Validating schema: {schema_file}")
            code = self.validate_schema(str(schema_file))
            max_exit_code = max(max_exit_code, code)
            self.errors.clear()

        return max_exit_code

    def generate_report(self, project_path: str, output_path: str) -> int:
        """Generate a comprehensive validation report."""
        project = Path(project_path)
        report_lines = [
            "# Firestore Validation Report\n",
            f"\nProject: `{project_path}`\n",
            f"Generated: {self._get_timestamp()}\n",
            "\n---\n\n"
        ]

        all_errors = []
        all_warnings = []

        # Validate all files and collect results
        rules_file = project / 'firestore.rules'
        if not rules_file.exists() and (project / 'rules.md').exists():
            rules_file = project / 'rules.md'

        if rules_file.exists():
            report_lines.append("## Security Rules\n")
            self.validate_rules(str(rules_file))
            if self.errors:
                report_lines.append("### Issues Found\n")
                for err in self.errors:
                    report_lines.append(f"- {err}\n")
                all_errors.extend(self.errors)
            else:
                report_lines.append("✅ No issues found\n")
            self.errors.clear()

        indexes_file = project / 'firestore_indexes.json'
        if indexes_file.exists():
            report_lines.append("\n## Index Configuration\n")
            self.validate_indexes(str(indexes_file))
            if self.errors:
                report_lines.append("### Issues Found\n")
                for err in self.errors:
                    report_lines.append(f"- {err}\n")
                all_errors.extend(self.errors)
            else:
                report_lines.append("✅ No issues found\n")
            self.errors.clear()

        for schema_file in project.glob('*.json'):
            if schema_file.name == 'firestore_indexes.json':
                continue
            report_lines.append(f"\n## Schema: {schema_file.name}\n")
            self.validate_schema(str(schema_file))
            if self.errors:
                report_lines.append("### Issues Found\n")
                for err in self.errors:
                    report_lines.append(f"- {err}\n")
                all_errors.extend(self.errors)
            else:
                report_lines.append("✅ No issues found\n")
            self.errors.clear()

        # Summary
        report_lines.append("\n---\n")
        report_lines.append("## Summary\n")
        report_lines.append(f"- **Total Errors:** {len(all_errors)}\n")
        report_lines.append(f"- **Total Warnings:** {len(all_warnings)}\n")
        
        status = "✅ PASSED" if len(all_errors) == 0 else "❌ FAILED"
        report_lines.append(f"\n**Validation Status:** {status}\n")

        # Write report
        with open(output_path, 'w', encoding='utf-8') as f:
            f.writelines(report_lines)

        print(f"\n📄 Report generated: {output_path}")
        return EXIT_SUCCESS if len(all_errors) == 0 else EXIT_SECURITY_VIOLATION

    # Private validation methods

    def _check_permissive_rules(self, content: str, lines: List[str]):
        """Check for overly permissive security rules."""
        patterns = [
            (r'allow\s+read,\s*write:\s*if\s+true', "Overly permissive rule: 'allow read, write: if true'"),
            (r'match\s+/\{document=\*\*\}.*allow', "Wildcard match with allow - review carefully"),
        ]
        
        for i, line in enumerate(lines, 1):
            for pattern, message in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    self.errors.append(ValidationError(
                        EXIT_SECURITY_VIOLATION,
                        message,
                        line=i,
                        suggestion="Restrict access to authenticated users or specific conditions"
                    ))

    def _check_combined_permissions(self, content: str, lines: List[str]):
        """Check for combined read/write permissions without granularity."""
        auth_patterns = ['request.auth', 'isAdmin', 'isLandlord']
        for i, line in enumerate(lines, 1):
            if re.search(r'allow\s+read,\s*write:', line):
                if not any(p in line for p in auth_patterns):
                    self.errors.append(ValidationError(
                        EXIT_SECURITY_VIOLATION,
                        "Combined read/write permission without authentication check",
                        line=i,
                        suggestion="Separate read and write rules or add authentication requirement"
                    ))

    def _check_auth_requirements(self, content: str, lines: List[str]):
        """Check that authentication is required for sensitive operations."""
        write_pattern = r'allow\s+(write|create|update|delete):'
        auth_patterns = ['request.auth', 'isAdmin', 'isLandlord']
        
        for i, line in enumerate(lines, 1):
            if re.search(write_pattern, line):
                if not any(p in line for p in auth_patterns) and 'if false' not in line:
                    # Check next couple lines for auth check
                    context = '\n'.join(lines[max(0, i-1):min(len(lines), i+3)])
                    if not any(p in context for p in auth_patterns):
                        self.errors.append(ValidationError(
                            EXIT_SECURITY_VIOLATION,
                            "Write operation without authentication requirement",
                            line=i,
                            suggestion="Add 'request.auth != null' or 'request.auth.uid == userId' condition"
                        ))

    def _check_wildcard_matches(self, content: str, lines: List[str]):
        """Check for unrestricted wildcard matches."""
        if re.search(r'match\s+/\{document=\*\*\}', content):
            # Find if there's any restriction
            if not re.search(r'match\s+/\{document=\*\*\}[^}]*if\s+false', content):
                self.warnings.append("Wildcard match found - ensure it has appropriate restrictions")

    def _check_redundant_indexes(self, indexes: List[Dict]):
        """Check for redundant single-field indexes."""
        for idx in indexes:
            fields = idx.get('fields', [])
            if len(fields) == 1:
                self.errors.append(ValidationError(
                    EXIT_INDEX_VIOLATION,
                    f"Redundant single-field index on '{fields[0].get('fieldPath', 'unknown')}'",
                    suggestion="Firestore automatically indexes single fields - remove this index"
                ))

    def _check_index_collections(self, indexes: List[Dict]):
        """Check that all indexes reference valid collection paths."""
        for idx in indexes:
            collection = idx.get('collectionGroup', '') or idx.get('collection', '')
            if not collection:
                self.errors.append(ValidationError(
                    EXIT_INDEX_VIOLATION,
                    "Index missing collectionGroup/collection field"
                ))
            elif not self._is_valid_collection_name(collection):
                self.errors.append(ValidationError(
                    EXIT_NAMING_VIOLATION,
                    f"Collection name '{collection}' violates naming convention",
                    suggestion="Use snake_case or camelCase for collection names"
                ))

    def _check_collection_naming(self, schema: Dict):
        """Check collection naming follows convention."""
        collection = schema.get('collection', '')
        if collection and not self._is_valid_collection_name(collection):
            self.errors.append(ValidationError(
                EXIT_NAMING_VIOLATION,
                f"Collection name '{collection}' violates naming convention",
                suggestion="Use snake_case or camelCase with plural nouns"
            ))

        # Check subcollections
        for sub in schema.get('subcollections', []):
            sub_name = sub.get('name', '')
            if sub_name and not self._is_valid_collection_name(sub_name):
                self.errors.append(ValidationError(
                    EXIT_NAMING_VIOLATION,
                    f"Subcollection name '{sub_name}' violates naming convention",
                    suggestion="Use snake_case or camelCase"
                ))

    def _check_timestamp_fields(self, schema: Dict):
        """Check for required timestamp fields."""
        fields = schema.get('fields', {})
        
        # Support both snake_case and camelCase for timestamps
        timestamp_pairs = [
            (['created_at', 'createdAt'], 'creation'),
            (['updated_at', 'updatedAt'], 'update')
        ]
        
        for options, type_name in timestamp_pairs:
            found = False
            for opt in options:
                if opt in fields:
                    found = True
                    field_def = fields[opt]
                    if field_def.get('type') not in ['timestamp', 'Timestamp']:
                        self.errors.append(ValidationError(
                            EXIT_STRUCTURE_VIOLATION,
                            f"Field '{opt}' should be of type 'timestamp', not '{field_def.get('type')}'",
                            suggestion="Use Firestore Timestamp type for date/time fields"
                        ))
                    break
            
            if not found:
                self.errors.append(ValidationError(
                    EXIT_STRUCTURE_VIOLATION,
                    f"Missing required {type_name} timestamp field (one of: {', '.join(options)})",
                    suggestion=f"Add '{options[1]}' (preferred) or '{options[0]}' field with type 'timestamp' and required: true"
                ))

    def _check_nesting_depth(self, schema: Dict, max_depth: int = 3):
        """Check that nested structures don't exceed maximum depth."""
        fields = schema.get('fields', {})
        
        def check_depth(obj: Dict, current_depth: int, path: str):
            if current_depth > max_depth:
                self.errors.append(ValidationError(
                    EXIT_STRUCTURE_VIOLATION,
                    f"Nesting too deep at '{path}' (depth: {current_depth}, max: {max_depth})",
                    suggestion="Consider using subcollections or flattening the structure"
                ))
                return
            
            if not isinstance(obj, dict):
                return

            for key, value in obj.items():
                if isinstance(value, dict):
                    if value.get('type') == 'map' and 'properties' in value:
                        check_depth(value['properties'], current_depth + 1, f"{path}.{key}")
        
        check_depth(fields, 1, 'root')

    def _check_field_types(self, schema: Dict):
        """Validate field type definitions."""
        valid_types = [
            'string', 'number', 'boolean', 'map', 'array',
            'timestamp', 'Timestamp', 'geopoint', 'GeoPoint',
            'reference', 'DocumentReference', 'null'
        ]
        
        fields = schema.get('fields', {})
        if not isinstance(fields, dict):
            return

        for field_name, field_def in fields.items():
            if not isinstance(field_def, dict):
                continue
            field_type = field_def.get('type', '')
            if field_type and field_type not in valid_types:
                self.errors.append(ValidationError(
                    EXIT_STRUCTURE_VIOLATION,
                    f"Invalid field type '{field_type}' for field '{field_name}'",
                    suggestion=f"Use one of: {', '.join(valid_types)}"
                ))

    def _is_valid_collection_name(self, name: str) -> bool:
        """Check if collection name follows snake_case or camelCase convention."""
        return bool(re.match(r'^[a-z][a-zA-Z0-9]*(_[a-z0-9]+)*$', name))

    def _get_timestamp(self) -> str:
        """Get current timestamp for reports."""
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def _report_errors(self) -> int:
        """Print errors and return appropriate exit code."""
        if not self.errors:
            print("✅ Validation passed - no issues found")
            return EXIT_SUCCESS

        print(f"\n❌ Validation failed - {len(self.errors)} issue(s) found:\n")
        
        max_code = EXIT_SUCCESS
        for error in self.errors:
            print(f"  {error}\n")
            max_code = max(max_code, error.code)

        return max_code


def main():
    parser = argparse.ArgumentParser(
        description='Validate Firestore database configurations',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s rules firestore.rules
  %(prog)s indexes firestore.indexes.json
  %(prog)s schema users.schema.json
  %(prog)s project ./my-firebase-project
  %(prog)s report ./my-firebase-project --output report.md
        """
    )
    
    parser.add_argument(
        'command',
        choices=['rules', 'indexes', 'schema', 'project', 'report'],
        help='Validation type to perform'
    )
    
    parser.add_argument(
        'path',
        help='Path to file or project directory'
    )
    
    parser.add_argument(
        '--output', '-o',
        default='validation_report.md',
        help='Output path for report (only used with "report" command)'
    )

    args = parser.parse_args()
    validator = FirestoreValidator()

    if args.command == 'rules':
        exit_code = validator.validate_rules(args.path)
    elif args.command == 'indexes':
        exit_code = validator.validate_indexes(args.path)
    elif args.command == 'schema':
        exit_code = validator.validate_schema(args.path)
    elif args.command == 'project':
        exit_code = validator.validate_project(args.path)
    elif args.command == 'report':
        exit_code = validator.generate_report(args.path, args.output)
    else:
        parser.print_help()
        exit_code = 1

    sys.exit(exit_code)


if __name__ == '__main__':
    main()