import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'subscriber@example.com' })
  @IsEmail()
  email: string;
}
