import { Module } from '@nestjs/common';
import { WeeklyEditionsController } from './weekly-editions.controller';
import { WeeklyEditionsService } from './weekly-editions.service';

@Module({
  controllers: [WeeklyEditionsController],
  providers: [WeeklyEditionsService],
  exports: [WeeklyEditionsService],
})
export class WeeklyEditionsModule {}
