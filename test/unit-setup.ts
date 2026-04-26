// Unit test setup - no database required

// Mock factories for unit tests
export const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
  })),
});

// Mock JWT service
export const createMockJwtService = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
});

// Mock users service
export const createMockUsersService = () => ({
  findByUsername: jest.fn(),
  findById: jest.fn(),
  createAnonymous: jest.fn(),
  verifyPin: jest.fn(),
  setPin: jest.fn(),
  removePin: jest.fn(),
  update: jest.fn(),
  touchStreak: jest.fn(),
  toResponseDto: jest.fn(),
});

// Test data factories
export const createTestUser = (overrides: Record<string, unknown> = {}) => {
  const joinedDate = (overrides.joinedDate as Date) ?? new Date();
  const progressRecords = (overrides.progressRecords as unknown[]) ?? [];
  return {
    id: 'test-user-id',
    username: 'testuser',
    pinHash: null,
    language: 'rw',
    dayStreak: 0,
    lastActiveDate: null,
    avatarSeed: '01',
    isPrivate: false,
    progressRecords,
    quizAttempts: [],
    joinedDate,
    updatedAt: new Date(),
    // Backward-compatibility getters matching User entity
    get pin() { return this.pinHash; },
    set pin(v: string | null) { this.pinHash = v; },
    get createdAt() { return this.joinedDate; },
    set createdAt(v: Date) { this.joinedDate = v; },
    get progress() { return this.progressRecords; },
    set progress(v: unknown[]) { this.progressRecords = v as never[]; },
    ...overrides,
  } as unknown as import('../src/modules/users/entities/user.entity').User;
};

export const createTestLesson = (overrides = {}) => ({
  id: 'test-lesson-id',
  slug: 'test-lesson',
  title: 'Test Lesson',
  category: 'menstrual_health',
  durationMinutes: 30,
  isActive: true,
  chapters: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Increase test timeout for async operations
jest.setTimeout(10000);