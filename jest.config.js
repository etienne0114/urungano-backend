module.exports = {
  // Multi-project configuration for unit, integration, and e2e tests
  projects: [
    // Unit tests project
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/unit-setup.ts'],
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.(t|j)s',
        '!src/**/*.spec.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
        '!src/main.ts',
        '!src/**/*.module.ts'
      ],
      coverageDirectory: 'coverage/unit',
      coverageReporters: ['text', 'lcov', 'html'],
      coverageThreshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jsdom|isomorphic-dompurify|dompurify|html-encoding-sniffer|whatwg-url|whatwg-mimetype|data-urls|abab|nwsapi|cssstyle|@exodus/bytes|decimal.js|form-data)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@database/(.*)$': '<rootDir>/src/database/$1',
        '^dompurify$': 'dompurify/dist/purify.js'
      }
    },
    
    // Integration tests project
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/**/*.spec.ts', '!<rootDir>/test/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.(t|j)s',
        '!src/**/*.spec.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
        '!src/main.ts',
        '!src/**/*.module.ts'
      ],
      coverageDirectory: 'coverage/integration',
      coverageReporters: ['text', 'lcov', 'html'],
      testTimeout: 60000, // Longer timeout for database operations
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jsdom|isomorphic-dompurify|dompurify|html-encoding-sniffer|whatwg-url|whatwg-mimetype|data-urls|abab|nwsapi|cssstyle|@exodus/bytes|decimal.js|form-data)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@database/(.*)$': '<rootDir>/src/database/$1',
        '^dompurify$': 'dompurify/dist/purify.js'
      }
    },
    
    // E2E tests project
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
      testEnvironment: 'node',
      collectCoverageFrom: [
        'src/**/*.(t|j)s',
        '!src/**/*.spec.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
        '!src/main.ts',
        '!src/**/*.module.ts'
      ],
      coverageDirectory: 'coverage/e2e',
      coverageReporters: ['text', 'lcov', 'html'],
      testTimeout: 120000, // Longest timeout for full application tests
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jsdom|isomorphic-dompurify|dompurify|html-encoding-sniffer|whatwg-url|whatwg-mimetype|data-urls|abab|nwsapi|@exodus/bytes)/)'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@database/(.*)$': '<rootDir>/src/database/$1',
        '^dompurify$': 'dompurify/dist/purify.js'
      }
    }
  ],
  
  // Global configuration
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  
  // Transform configuration
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Module name mapping for path aliases and external dependencies
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^dompurify$': 'dompurify/dist/purify.js'
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(jsdom|isomorphic-dompurify|dompurify|html-encoding-sniffer|whatwg-url|whatwg-mimetype|data-urls|abab|nwsapi|@exodus/bytes)/)'
  ],
  
  // Global coverage configuration
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/main.ts',
    '!src/**/*.module.ts'
  ],
  
  // Combined coverage directory
  coverageDirectory: 'coverage',
  
  // Global coverage thresholds (>90% target)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],
  
  // Default test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true
};