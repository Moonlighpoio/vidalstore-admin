import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { RabbitAdminService } from './rabbit-admin.service';
import {
  CreateBindingDto,
  CreateExchangeDto,
  CreateQueueDto,
  ReprocesarMensajeMuertoDto,
} from './dto/admin.dto';

interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

@Controller('v1/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly rabbitAdmin: RabbitAdminService) {}

  @Get('colas')
  listarColas() {
    return this.rabbitAdmin.listarColas();
  }

  @Post('colas')
  crearCola(@Body() dto: CreateQueueDto) {
    return this.rabbitAdmin.crearCola(dto);
  }

  @Delete('colas/:nombre')
  eliminarCola(@Param('nombre') nombre: string) {
    return this.rabbitAdmin.eliminarCola(nombre);
  }

  @Get('exchanges')
  listarExchanges() {
    return this.rabbitAdmin.listarExchanges();
  }

  @Post('exchanges')
  crearExchange(@Body() dto: CreateExchangeDto) {
    return this.rabbitAdmin.crearExchange(dto);
  }

  @Delete('exchanges/:nombre')
  eliminarExchange(@Param('nombre') nombre: string) {
    return this.rabbitAdmin.eliminarExchange(nombre);
  }

  @Post('bindings')
  crearBinding(@Body() dto: CreateBindingDto) {
    return this.rabbitAdmin.crearBinding(dto);
  }

  @Delete('bindings')
  eliminarBinding(@Body() dto: CreateBindingDto) {
    return this.rabbitAdmin.eliminarBinding(dto);
  }

  @Post('dlq/:id/reproceso')
  reprocesar(
    @Param('id') id: string,
    @Body() dto: ReprocesarMensajeMuertoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const solicitadoPor = request.user?.sub;

    if (!solicitadoPor) {
      throw new UnauthorizedException('Token subject is required');
    }

    return this.rabbitAdmin.reprocesarMensajeMuerto(
      id,
      solicitadoPor,
      dto.payloadCorregido,
    );
  }
}
