import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';

// Перечисление типов каналов
export enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice'
}

// Перечисление прав доступа
export enum Permission {
  MANAGE_SERVER = 'manage_server',
  MANAGE_CHANNELS = 'manage_channels',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_MESSAGES = 'manage_messages',
  SEND_MESSAGES = 'send_messages',
  READ_MESSAGES = 'read_messages',
  CONNECT = 'connect',
  SPEAK = 'speak',
  VIDEO = 'video',
  MENTION_EVERYONE = 'mention_everyone',
  ADD_REACTIONS = 'add_reactions'
}

// Модель группы (сервера)
@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column()
  creatorId: number;

  @OneToMany(() => Channel, channel => channel.server)
  channels: Channel[];

  @OneToMany(() => Role, role => role.server)
  roles: Role[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'server_members',
    joinColumn: { name: 'serverId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  members: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Модель канала
@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ChannelType
  })
  type: ChannelType;

  @ManyToOne(() => Server, server => server.channels)
  server: Server;

  @Column('uuid')
  serverId: string;

  @Column({ default: false })
  isPrivate: boolean;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'channel_role_permissions',
    joinColumn: { name: 'channelId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' }
  })
  allowedRoles: Role[];

  @Column('jsonb', { nullable: true })
  activeCall: {
    participants: string[];
    startTime: Date;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Модель роли
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  color: string;

  @Column('uuid')
  serverId: string;

  @ManyToOne(() => Server, server => server.roles)
  server: Server;

  @Column('simple-array')
  permissions: Permission[];

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Модель пользователя (для связей)
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @ManyToMany(() => Server, server => server.members)
  servers: Server[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' }
  })
  roles: Role[];
} 