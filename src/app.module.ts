import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule, TransactionsModule, RolesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
