import { Request, Response } from 'express';
import { Controller, Post, Get, Put, Delete, Body, Param, UseBefore, QueryParam, Req, JsonController, Res, HttpCode } from 'routing-controllers';
import { UserModel, User } from '../../models/UserModel';
import { authMiddleware } from '../../middleware/auth';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../../../config';
import bcrypt from 'bcrypt';
import { redisClient } from '../../redis/client';
import { producer as kafkaProducer } from '../../kafka/producer';

interface JwtPayload {
  id: string;
  email: string;
  username?: string;
  iat?: number;
  exp?: number;
}

interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt: Date;
  username: string;
  avatar: string;
}

interface UserSettings {
  notifications: boolean;
  theme: 'light' | 'dark';
  language: string;
}

@JsonController('/users')
export class UserController {
  private kafkaProducer = kafkaProducer;
  private redisClient = redisClient;

  constructor() {
    this.initKafka();
  }

  private async initKafka() {
    try {
      await this.kafkaProducer.connect();
    } catch (error) {
      console.error('Failed to initialize Kafka producer:', error);
    }
  }

  @Get('/health')
  @HttpCode(200)
  health() {
    return { status: 'ok' };
  }

  private toErrorWithMessage(error: unknown): Error & { message: string } {
    if (error instanceof Error) return error;
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error(String(error));
    }
  }

  @Post('/register')
  @HttpCode(201)
  async register(
    @Body() userData: {
      username: string;
      email: string;
      password: string;
      settings?: Partial<UserSettings>;
    },
    @Res() response: Response
  ) {
    try {
      const existingUser = await UserModel.findOne({
        username: userData.username,
        email: userData.email
      });

      if (existingUser) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const defaultSettings: UserSettings = {
        notifications: true,
        theme: 'light',
        language: 'ru'
      };

      const user = await UserModel.create({
        ...userData,
        password: hashedPassword,
        settings: {
          ...defaultSettings,
          ...(userData.settings || {})
        }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret as Secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      await this.kafkaProducer.send({
        topic: 'user-registered',
        messages: [{
          value: JSON.stringify({
            userId: user.id,
            username: user.username,
            email: user.email,
          })
        }]
      });

      await this.redisClient.setex(`user:${user.id}`, 3600, JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      }));

      return response.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          status: user.status,
          settings: user.settings
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return response.status(201).json({
        status: 401,
        message: "Неверный email или пароль"
      });
    }
  }

  @Post('/login')
  @HttpCode(200)
  async login(
    @Body() credentials: { email: string; password: string },
    @Res() response: Response
  ) {
    try {
      const user = await UserModel.findOne({ email: credentials.email });
      
      if (!user) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      const isValidPassword = await UserModel.comparePassword(user, credentials.password);
      if (!isValidPassword) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      const updatedUser = await UserModel.save({
        ...user,
        status: 'online',
        lastSeen: new Date()
      });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret as Secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      await this.kafkaProducer.send({
        topic: 'user-logged-in',
        messages: [{
          value: JSON.stringify({
            userId: updatedUser.id,
            username: updatedUser.username,
          })
        }]
      });

      await this.redisClient.setex(`user:${updatedUser.id}`, 3600, JSON.stringify({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        status: updatedUser.status
      }));

      return {
        token,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          status: updatedUser.status,
          settings: updatedUser.settings
        }
      };
    } catch (error) {
      return response.status(201).json({
        status: 401,
        message: "Неверный email или пароль"
      });
    }
  }

  @Get('/profile')
  @UseBefore(authMiddleware)
  @HttpCode(200)
  async getProfile(@Res() response: Response) {
    try {
      const userId = response.locals.user?.id;
      if (!userId) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      const cachedUser = await this.redisClient.get(`user:${userId}`);
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      await this.redisClient.setex(`user:${userId}`, 3600, JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings
      }));

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings
      };
    } catch (error) {
      return response.status(201).json({
        status: 401,
        message: "Неверный email или пароль"
      });
    }
  }

  @Put('/profile')
  @UseBefore(authMiddleware)
  @HttpCode(200)
  async updateProfile(
    @Body() updateData: {
      username?: string;
      email?: string;
      avatar?: string;
      settings?: Partial<UserSettings>;
    },
    @Res() response: Response
  ) {
    try {
      const userId = response.locals.user?.id;
      if (!userId) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return response.status(201).json({
          status: 401,
          message: "Неверный email или пароль"
        });
      }

      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await UserModel.findOne({ username: updateData.username });
        if (existingUser) {
          return response.status(201).json({
            status: 401,
            message: "Пользователь с таким именем уже существует"
          });
        }
      }

      const updatedUser = await UserModel.save({
        ...user,
        ...updateData,
        settings: updateData.settings ? {
          ...user.settings,
          ...(updateData.settings || {})
        } : user.settings
      });

      await this.kafkaProducer.send({
        topic: 'user-updated',
        messages: [{
          value: JSON.stringify({
            userId: updatedUser.id,
            username: updatedUser.username,
            changes: updateData
          })
        }]
      });

      await this.redisClient.del(`user:${userId}`);

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
        settings: updatedUser.settings
      };
    } catch (error) {
      return response.status(201).json({
        status: 401,
        message: "Неверный email или пароль"
      });
    }
  }

  @Get('/search')
  @UseBefore(authMiddleware)
  async searchUsers(
    @QueryParam('query') query: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 10
  ) {
    try {
      const searchQuery = {
        username: { ilike: query },
        email: { ilike: query }
      };

      const [users, total] = await Promise.all([
        UserModel.findMany(searchQuery, { skip: (page - 1) * limit, limit }),
        UserModel.count(searchQuery)
      ]);

      return {
        users: users.map((user: User) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          status: user.status
        })),
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: unknown) {
      const errorWithMessage = this.toErrorWithMessage(error);
      throw new Error(`Failed to search users: ${errorWithMessage.message}`);
    }
  }

  @Post('/contacts/:contactId')
  @UseBefore(authMiddleware)
  async addContact(@Param('contactId') contactId: string, @Req() req: Request) {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const [user, contact] = await Promise.all([
        UserModel.findById(userId),
        UserModel.findById(contactId)
      ]);

      if (!user || !contact) {
        throw new Error(user ? 'Contact not found' : 'User not found');
      }

      const success = await UserModel.sendFriendRequest(userId, contactId);
      if (!success) {
        throw new Error('Failed to send friend request');
      }

      await this.kafkaProducer.send({
        topic: 'friend-request-sent',
        messages: [{
          value: JSON.stringify({
            userId,
            contactId,
            timestamp: new Date().toISOString()
          })
        }]
      });

      return { message: 'Friend request sent successfully' };
    } catch (error: unknown) {
      const errorWithMessage = this.toErrorWithMessage(error);
      throw new Error(`Failed to add contact: ${errorWithMessage.message}`);
    }
  }

  @Delete('/contacts/:contactId')
  @UseBefore(authMiddleware)
  async removeContact(@Param('contactId') contactId: string, @Req() req: Request) {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const [user, contact] = await Promise.all([
        UserModel.findById(userId),
        UserModel.findById(contactId)
      ]);

      if (!user || !contact) {
        throw new Error(user ? 'Contact not found' : 'User not found');
      }

      const success = await UserModel.removeFriend(userId, contactId);
      if (!success) {
        throw new Error('Failed to remove friend');
      }

      await this.kafkaProducer.send({
        topic: 'friend-removed',
        messages: [{
          value: JSON.stringify({
            userId,
            contactId,
            timestamp: new Date().toISOString()
          })
        }]
      });

      return { message: 'Friend removed successfully' };
    } catch (error: unknown) {
      const errorWithMessage = this.toErrorWithMessage(error);
      throw new Error(`Failed to remove contact: ${errorWithMessage.message}`);
    }
  }

  @Get('/me')
  @UseBefore(authMiddleware)
  async getMyProfile(@Req() req: Request) {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const [user, friends, friendRequests] = await Promise.all([
        UserModel.findById(userId),
        UserModel.getFriends(userId),
        UserModel.getFriendRequests(userId)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings,
        lastSeen: user.lastSeen,
        friends: friends.map((friend: User) => ({
          id: friend.id,
          username: friend.username,
          avatar: friend.avatar,
          status: friend.status
        })),
        friendRequests: {
          incoming: friendRequests.incoming.map((request) => ({
            id: request.id,
            userId: request.userId,
            friendId: request.friendId,
            username: request.username,
            avatar: request.avatar,
            status: request.status,
            createdAt: request.createdAt
          })),
          outgoing: friendRequests.outgoing.map((request) => ({
            id: request.id,
            userId: request.userId,
            friendId: request.friendId,
            username: request.username,
            avatar: request.avatar,
            status: request.status,
            createdAt: request.createdAt
          }))
        }
      };
    } catch (error: unknown) {
      const errorWithMessage = this.toErrorWithMessage(error);
      throw new Error(`Failed to get profile: ${errorWithMessage.message}`);
    }
  }

  @Get('/profile/:userId')
  @UseBefore(authMiddleware)
  async getUserProfile(@Param('userId') targetUserId: string, @Req() req: Request) {
    try {
      const currentUserId = req.user?.id?.toString();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const [user, friends, mutualFriends] = await Promise.all([
        UserModel.findById(targetUserId),
        UserModel.getFriends(currentUserId),
        UserModel.getMutualFriends(currentUserId, targetUserId)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      const isFriend = friends.some((friend: User) => friend.id === targetUserId);
      const friendshipStatus = await UserModel.getFriendshipStatus(currentUserId, targetUserId);

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: user.status,
        lastSeen: user.lastSeen,
        isFriend,
        friendshipStatus,
        mutualFriends: mutualFriends.map((friend: User) => ({
          id: friend.id,
          username: friend.username,
          avatar: friend.avatar,
          status: friend.status
        }))
      };
    } catch (error: unknown) {
      const errorWithMessage = this.toErrorWithMessage(error);
      throw new Error(`Failed to get user profile: ${errorWithMessage.message}`);
    }
  }

  @Get('/friends')
  @UseBefore(authMiddleware)
  async getFriends(@Req() req: Request) {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const friends = await UserModel.getFriends(userId);
      return friends.map((friend: User) => ({
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        status: friend.status
      }));
    } catch (error: unknown) {
      const errorWithMessage = this.toErrorWithMessage(error);
      throw new Error(`Failed to get friends: ${errorWithMessage.message}`);
    }
  }
} 