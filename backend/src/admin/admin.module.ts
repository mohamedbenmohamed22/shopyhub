import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { WeeklyEditionsModule } from '../weekly-editions/weekly-editions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule, OrdersModule, SubscribersModule, WeeklyEditionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
