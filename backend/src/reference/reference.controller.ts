import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';

@ApiTags('reference')
@Controller('reference')
export class ReferenceController {
  constructor(private readonly reference: ReferenceService) {}

  @Get('categories')
  categories() {
    return this.reference.categories();
  }

  @Get('governorates')
  governorates() {
    return this.reference.governorates();
  }
}
