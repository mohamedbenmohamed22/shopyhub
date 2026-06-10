import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OrdersService } from '../orders/orders.service';
import { QueryOrdersDto } from '../orders/dto/query-orders.dto';
import { ProductsService } from '../products/products.service';
import { QueryProductsDto } from '../products/dto/query-products.dto';
import { SubscribersService } from '../subscribers/subscribers.service';
import { WeeklyEditionsService } from '../weekly-editions/weekly-editions.service';
import { AdminService } from './admin.service';

/**
 * Single admin namespace. Everything here is JWT-protected and shows ALL
 * elements — including non-public ones (draft/archived products, unsubscribed
 * emails, every order and vote).
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly products: ProductsService,
    private readonly orders: OrdersService,
    private readonly subscribers: SubscribersService,
    private readonly editions: WeeklyEditionsService,
  ) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('products')
  allProducts(@Query() query: QueryProductsDto) {
    return this.products.findAll(query, true); // include every status
  }

  @Get('orders')
  allOrders(@Query() query: QueryOrdersDto) {
    return this.orders.findAll(query);
  }

  @Get('subscribers')
  allSubscribers(@Query() query: PaginationDto, @Query('status') status?: SubStatus) {
    return this.subscribers.findAll(query, status);
  }

  @Get('votes')
  allVotes(@Query() query: PaginationDto) {
    return this.admin.votes(query);
  }

  @Get('editions')
  allEditions() {
    return this.editions.findAll();
  }
}
