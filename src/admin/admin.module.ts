import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RabbitAdminService } from './rabbit-admin.service';

@Module({
  controllers: [AdminController],
  providers: [RabbitAdminService],
  exports: [RabbitAdminService],
})
export class AdminModule {}
