import { Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { identity, publicVariables } from './config';

@Controller()
export class AppController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  root() { return { ...identity(), endpoints: ['/health', '/ready', '/server', '/pgtest', '/vartest'] }; }

  @Get('health')
  health() { return { status: 'ok', ...identity() }; }

  @Get('ready')
  async ready() { await this.database.read(); return { status: 'ready', ...identity() }; }

  @Get('server')
  @Header('Cache-Control', 'no-store')
  server() { return identity(); }

  @Get('vartest')
  @Header('Cache-Control', 'no-store')
  variables() { return { ...identity(), ...publicVariables() }; }

  @Get('pgtest')
  async pgRead() { return { ...identity(), ...await this.database.read() }; }

  @Post('pgtest')
  @HttpCode(200)
  async pgWriteRead() { return { ...identity(), ...await this.database.writeRead() }; }
}
