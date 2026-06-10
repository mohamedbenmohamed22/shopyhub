import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { VotesModule } from './votes/votes.module';
import { WeeklyEditionsModule } from './weekly-editions/weekly-editions.module';
import { ReferenceModule } from './reference/reference.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { ListenersModule } from './listeners/listeners.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    SubscribersModule,
    VotesModule,
    WeeklyEditionsModule,
    ReferenceModule,
    CategoriesModule,
    TagsModule,
    ListenersModule,
    AdminModule,
  ],
})
export class AppModule {}
