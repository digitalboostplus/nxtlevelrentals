import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...nextVitals,
  {
    ignores: ['.next/**', '.next-test/**', 'out/**', '.agent-artifacts/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      // Keep newly introduced compiler diagnostics visible without making this
      // dependency upgrade require a separate React state-management rewrite.
      // Rules of Hooks and exhaustive-deps retain the Next.js defaults.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];
