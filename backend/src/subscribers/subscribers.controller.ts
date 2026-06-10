import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscribersService } from './subscribers.service';

@ApiTags('subscribers')
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribers: SubscribersService) {}

  // ---- Public ----
  @Post()
  @HttpCode(201)
  subscribe(@Body() dto: SubscribeDto) {
    return this.subscribers.subscribe(dto.email);
  }

  @Delete(':token')
  unsubscribe(@Param('token') token: string) {
    return this.subscribers.unsubscribe(token);
  }

  // ---- Admin ----
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(@Query() query: PaginationDto, @Query('status') status?: SubStatus) {
    return this.subscribers.findAll(query, status);
  }
}
