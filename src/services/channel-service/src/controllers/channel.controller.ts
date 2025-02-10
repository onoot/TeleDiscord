import { Request, Response } from 'express';
import { JsonController, Get, Post, Put, Delete, Body, Param, CurrentUser, UseBefore, HttpError, QueryParam } from 'routing-controllers';
import { Server, Channel, Role, ChannelType, Permission } from '../models/channel.model';
import { authMiddleware } from '../middleware/auth';
import { DataSource, Repository } from 'typeorm';
import { Server as SocketServer } from 'socket.io';

@JsonController('/api/v1/servers')
@UseBefore(authMiddleware)
export class ServerController {
  private serverRepository: Repository<Server>;
  private channelRepository: Repository<Channel>;
  private roleRepository: Repository<Role>;
  private io: SocketServer;

  constructor(dataSource: DataSource, io: SocketServer) {
    this.serverRepository = dataSource.getRepository(Server);
    this.channelRepository = dataSource.getRepository(Channel);
    this.roleRepository = dataSource.getRepository(Role);
    this.io = io;
  }

  // Создание сервера
  @Post('/')
  async createServer(@CurrentUser() userId: number, @Body() data: { name: string; description?: string; icon?: string }) {
    const server = new Server();
    server.name = data.name;
    server.description = data.description || "";
    server.icon = data.icon || null;
    server.creatorId = userId;

    // Создаем дефолтные роли
    const creatorRole = new Role();
    creatorRole.name = 'Creator';
    creatorRole.permissions = Object.values(Permission);
    creatorRole.isDefault = false;

    const memberRole = new Role();
    memberRole.name = 'Member';
    memberRole.permissions = [
      Permission.SEND_MESSAGES,
      Permission.READ_MESSAGES,
      Permission.CONNECT,
      Permission.SPEAK,
      Permission.VIDEO,
      Permission.ADD_REACTIONS
    ];
    memberRole.isDefault = true;

    // Создаем дефолтные каналы
    const generalTextChannel = new Channel();
    generalTextChannel.name = 'general';
    generalTextChannel.type = ChannelType.TEXT;
    generalTextChannel.server = server;

    const generalVoiceChannel = new Channel();
    generalVoiceChannel.name = 'General Voice';
    generalVoiceChannel.type = ChannelType.VOICE;
    generalVoiceChannel.server = server;

    await this.serverRepository.manager.transaction(async manager => {
      await manager.save(server);
      
      creatorRole.server = server;
      memberRole.server = server;
      await manager.save([creatorRole, memberRole]);
      
      await manager.save([generalTextChannel, generalVoiceChannel]);
    });

    return server;
  }

  // Получение списка серверов пользователя
  @Get('/my')
  async getMyServers(@CurrentUser() userId: number) {
    return this.serverRepository
      .createQueryBuilder('server')
      .leftJoinAndSelect('server.members', 'member')
      .where('member.id = :userId', { userId })
      .getMany();
  }

  // Получение информации о сервере
  @Get('/:serverId')
  async getServer(@CurrentUser() userId: number, @Param('serverId') serverId: string) {
    const server = await this.serverRepository.findOne({
      where: { id: serverId },
      relations: ['channels', 'roles', 'members']
    });

    if (!server) {
      throw new HttpError(404, 'Server not found');
    }

    return server;
  }

  // Создание канала
  @Post('/:serverId/channels')
  async createChannel(
    @CurrentUser() userId: number,
    @Param('serverId') serverId: string,
    @Body() data: { name: string; type: ChannelType; description?: string; isPrivate?: boolean }
  ) {
    const server = await this.serverRepository.findOne({
      where: { id: serverId },
      relations: ['roles']
    });

    if (!server) {
      throw new HttpError(404, 'Server not found');
    }

    // Проверяем права на создание каналов
    const hasPermission = await this.checkPermission(userId, serverId, Permission.MANAGE_CHANNELS);
    if (!hasPermission) {
      throw new HttpError(403, 'No permission to create channels');
    }

    const channel = new Channel();
    channel.name = data.name;
    channel.type = data.type;
    channel.description = data.description||"";
    channel.isPrivate = data.isPrivate || false;
    channel.server = server;

    await this.channelRepository.save(channel);
    return channel;
  }

  // Управление звонком в голосовом канале
  @Post('/:serverId/channels/:channelId/call')
  async manageCall(
    @CurrentUser() userId: number,
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Body() data: { action: 'join' | 'leave' }
  ) {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, serverId }
    });

    if (!channel) {
      throw new HttpError(404, 'Channel not found');
    }

    if (channel.type !== ChannelType.VOICE) {
      throw new HttpError(400, 'Not a voice channel');
    }

    // Проверяем права на подключение к голосовому каналу
    const hasPermission = await this.checkPermission(userId, serverId, Permission.CONNECT);
    if (!hasPermission) {
      throw new HttpError(403, 'No permission to connect to voice channels');
    }

    if (data.action === 'join') {
      if (!channel.activeCall) {
        channel.activeCall = {
          participants: [userId.toString()],
          startTime: new Date()
        };
      } else {
        const userIdStr = userId.toString();
        if (!channel.activeCall.participants.includes(userIdStr)) {
          channel.activeCall.participants.push(userIdStr);
        }
      }
    } else {
      if (channel.activeCall) {
        const userIdStr = userId.toString();
        channel.activeCall.participants = channel.activeCall.participants.filter(id => id !== userIdStr);
        if (channel.activeCall.participants.length === 0) {
          channel.activeCall = null;
        }
      }
    }

    await this.channelRepository.save(channel);

    // Оповещаем всех участников канала об изменении
    this.io.to(`channel:${channelId}`).emit('callStateChanged', {
      channelId,
      activeCall: channel.activeCall
    });

    return channel;
  }

  // Вспомогательный метод для проверки прав
  private async checkPermission(userId: number, serverId: string, permission: Permission): Promise<boolean> {
    const server = await this.serverRepository.findOne({
      where: { id: serverId },
      relations: ['roles', 'members']
    });

    if (!server) {
      throw new HttpError(404, 'Server not found');
    }

    // Если пользователь создатель сервера - у него есть все права
    if (server.creatorId === userId) {
      return true;
    }

    // Проверяем, является ли пользователь членом сервера
    const isMember = server.members.some(member => member.id === userId);
    if (!isMember) {
      return false;
    }

    // Получаем роли пользователя
    const userRoles = await this.roleRepository
      .createQueryBuilder('role')
      .innerJoin('role.server', 'server')
      .innerJoin('user_roles', 'ur', 'ur.roleId = role.id')
      .where('server.id = :serverId', { serverId })
      .andWhere('ur.userId = :userId', { userId })
      .getMany();

    // Проверяем наличие требуемого разрешения в ролях пользователя
    return userRoles.some(role => role.permissions.includes(permission));
  }
} 