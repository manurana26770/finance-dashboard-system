import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdministratorModule } from './administrator/administrator.module';

@Module({
  imports: [AdministratorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
