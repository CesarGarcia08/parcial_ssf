const securityPlugin = require('eslint-plugin-security');

const customRules = {
  'no-innerhtml': {
    meta: {
      type: 'problem',
      docs: { description: 'Detect innerHTML usage that could lead to XSS' },
      messages: {
        noInnerHTML: 'Potential XSS: innerHTML with user-controlled data detected. Use textContent or sanitize with DOMPurify.'
      }
    },
    create(context) {
      return {
        AssignmentExpression(node) {
          if (
            node.left.type === 'MemberExpression' &&
            node.left.property.name === 'innerHTML' &&
            node.right.type !== 'Literal'
          ) {
            context.report({ node: node.left, messageId: 'noInnerHTML' });
          }
        }
      };
    }
  },
  'no-settimeout-string': {
    meta: {
      type: 'problem',
      docs: { description: 'Detect setTimeout/setInterval with string argument' },
      messages: {
        noSetTimeoutString: 'Code Injection: setTimeout/setInterval with string argument is equivalent to eval(). Use function callback instead.'
      }
    },
    create(context) {
      return {
        CallExpression(node) {
          const name = node.callee.type === 'Identifier' ? node.callee.name : null;
          if ((name === 'setTimeout' || name === 'setInterval') && node.arguments.length > 0) {
            const firstArg = node.arguments[0];
            if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
              context.report({ node: firstArg, messageId: 'noSetTimeoutString' });
            }
            if (firstArg.type === 'TemplateLiteral') {
              context.report({ node: firstArg, messageId: 'noSetTimeoutString' });
            }
          }
        }
      };
    }
  },
  'no-prototype-pollution': {
    meta: {
      type: 'problem',
      docs: { description: 'Detect unsafe Object.assign/merge that could lead to Prototype Pollution' },
      messages: {
        noPrototypePollution: 'Prototype Pollution: Object.assign with potentially unsafe keys (__proto__, constructor, prototype). Sanitize keys before merging.'
      }
    },
    create(context) {
      return {
        CallExpression(node) {
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'assign' &&
            node.arguments.length > 1
          ) {
            const sourceArg = node.arguments[1];
            if (sourceArg && (sourceArg.type === 'ObjectExpression' || sourceArg.type === 'Identifier')) {
              context.report({ node: node, messageId: 'noPrototypePollution' });
            }
          }
        }
      };
    }
  }
};

const customPlugin = {
  rules: customRules,
  meta: {}
};

module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'backend/notas.db'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        window: 'readonly',
        document: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        prompt: 'readonly',
        confirm: 'readonly'
      }
    },
    plugins: {
      security: securityPlugin,
      custom: customPlugin
    },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'custom/no-innerhtml': 'error',
      'custom/no-settimeout-string': 'error',
      'custom/no-prototype-pollution': 'error'
    }
  },
  {
    files: ['frontend/js/**/*.js'],
    plugins: {
      security: securityPlugin,
      custom: customPlugin
    },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-non-literal-require': 'off',
      'custom/no-innerhtml': 'error',
      'custom/no-settimeout-string': 'error',
      'custom/no-prototype-pollution': 'error'
    }
  },
  {
    files: ['backend/**/*.js'],
    plugins: {
      security: securityPlugin
    },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn'
    }
  }
];