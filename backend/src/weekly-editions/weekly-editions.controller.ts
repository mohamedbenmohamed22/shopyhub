import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEditionDto, SetWinnerDto } from './dto/create-edition.dto';
import { WeeklyEditionsService } from './weekly-editions.service';

@ApiTags('weekly-editions')
@Controller('weekly-editions')
export class WeeklyEditionsController {
  constructor(private readonly editions: WeeklyEditionsService) {}

  // ---- Public ----
  @Get('current')
  current() {
    return this.editions.current();
  }

  @Get()
  findAll() {
    return this.editions.findAll();
  }

  // ---- Admin ----
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateEditionDto) {
    return this.editions.create(dto);
  }

  @Patch(':id/winner')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setWinner(@Param('id') id: string, @Body() dto: SetWinnerDto) {
    return this.editions.setWinner(id, dto.winnerProductId);
  }
}
