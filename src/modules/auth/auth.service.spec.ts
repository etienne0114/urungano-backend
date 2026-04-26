import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto } from './dto/auth.dto';
import { 
  createMockJwtService, 
  createMockUsersService, 
  createTestUser
} from '../../../test/unit-setup';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: createMockUsersService(),
        },
        {
          provide: JwtService,
          useValue: createMockJwtService(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signInAnonymous', () => {
    const username = 'testuser';
    const mockUser = createTestUser({ username });
    const mockToken = 'mock.jwt.token';

    beforeEach(() => {
      jwtService.sign.mockReturnValue(mockToken);
    });

    it('should create new user and return auth response when user does not exist', async () => {
      // Arrange
      usersService.findByUsername.mockResolvedValue(null);
      usersService.createAnonymous.mockResolvedValue(mockUser);

      // Act
      const result = await service.signInAnonymous(username);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
      expect(usersService.createAnonymous).toHaveBeenCalledWith(username);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
      expect(result).toMatchObject({
        accessToken: mockToken,
        userId: mockUser.id,
        username: mockUser.username,
        isNewUser: true,
      });
    });

    it('should return existing user and auth response when user exists', async () => {
      // Arrange
      usersService.findByUsername.mockResolvedValue(mockUser);

      // Act
      const result = await service.signInAnonymous(username);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
      expect(usersService.createAnonymous).not.toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
      expect(result).toMatchObject({
        accessToken: mockToken,
        userId: mockUser.id,
        username: mockUser.username,
        isNewUser: false,
      });
    });

    it('should handle empty username gracefully', async () => {
      // Arrange
      const emptyUsername = '';
      const userWithEmptyName = createTestUser({ username: emptyUsername });
      usersService.findByUsername.mockResolvedValue(null);
      usersService.createAnonymous.mockResolvedValue(userWithEmptyName);

      // Act
      const result = await service.signInAnonymous(emptyUsername);

      // Assert
      expect(result.isNewUser).toBe(true);
      expect(usersService.createAnonymous).toHaveBeenCalledWith(emptyUsername);
    });

    it('should propagate errors from UsersService.findByUsername', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      usersService.findByUsername.mockRejectedValue(error);

      // Act & Assert
      await expect(service.signInAnonymous(username)).rejects.toThrow('Database connection failed');
    });
  });

  describe('verifyPinAndIssueToken', () => {
    const userId = 'test-user-id';
    const pin = '1234';
    const mockUser = createTestUser({ id: userId });
    const mockToken = 'mock.jwt.token';

    beforeEach(() => {
      jwtService.sign.mockReturnValue(mockToken);
    });

    it('should verify PIN and return auth response when valid', async () => {
      // Arrange
      usersService.findById.mockResolvedValue(mockUser);
      usersService.verifyPin.mockResolvedValue(true);

      // Act
      const result = await service.verifyPinAndIssueToken(userId, pin);

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith(userId);
      expect(usersService.verifyPin).toHaveBeenCalledWith(userId, pin);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
      expect(result).toMatchObject({
        accessToken: mockToken,
        userId: mockUser.id,
        username: mockUser.username,
        isNewUser: false,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      usersService.findById.mockRejectedValue(new NotFoundException('User not found'));

      // Act & Assert
      await expect(service.verifyPinAndIssueToken(userId, pin)).rejects.toThrow(NotFoundException);
      expect(usersService.verifyPin).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when PIN is incorrect', async () => {
      // Arrange
      usersService.findById.mockResolvedValue(mockUser);
      usersService.verifyPin.mockResolvedValue(false);

      // Act & Assert
      await expect(service.verifyPinAndIssueToken(userId, pin)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validatePayload', () => {
    const payload: JwtPayload = {
      sub: 'test-user-id',
      username: 'testuser',
    };
    const mockUser = createTestUser({ id: payload.sub, username: payload.username });

    it('should return user when payload is valid', async () => {
      // Arrange
      usersService.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.validatePayload(payload);

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
      expect(result).toBe(mockUser);
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      // Arrange
      usersService.findById.mockRejectedValue(new NotFoundException('User not found'));

      // Act & Assert
      await expect(service.validatePayload(payload)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete anonymous sign-in flow', async () => {
      // Arrange
      const username = 'newuser';
      const newUser = createTestUser({ username });
      const token = 'integration.test.token';

      usersService.findByUsername.mockResolvedValue(null);
      usersService.createAnonymous.mockResolvedValue(newUser);
      jwtService.sign.mockReturnValue(token);

      // Act
      const result = await service.signInAnonymous(username);

      // Assert
      expect(result).toMatchObject({
        accessToken: token,
        userId: newUser.id,
        username: newUser.username,
        isNewUser: true,
      });
    });

    it('should handle complete PIN verification flow', async () => {
      // Arrange
      const userId = 'existing-user';
      const pin = '5678';
      const existingUser = createTestUser({ id: userId });
      const token = 'pin.verification.token';

      usersService.findById.mockResolvedValue(existingUser);
      usersService.verifyPin.mockResolvedValue(true);
      jwtService.sign.mockReturnValue(token);

      // Act
      const result = await service.verifyPinAndIssueToken(userId, pin);

      // Assert
      expect(result).toMatchObject({
        accessToken: token,
        userId: existingUser.id,
        username: existingUser.username,
        isNewUser: false,
      });
    });
  });

  describe('Performance considerations', () => {
    it('should not make unnecessary database calls for existing users', async () => {
      // Arrange
      const username = 'existing-user';
      const existingUser = createTestUser({ username });
      
      usersService.findByUsername.mockResolvedValue(existingUser);
      jwtService.sign.mockReturnValue('token');

      // Act
      await service.signInAnonymous(username);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledTimes(1);
      expect(usersService.createAnonymous).not.toHaveBeenCalled();
    });
  });
});