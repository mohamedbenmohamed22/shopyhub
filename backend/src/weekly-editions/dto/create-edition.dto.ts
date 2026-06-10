import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsDateString, IsUUID, Min } from 'class-validator';

export class CreateEditionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekNumber: number;

  @Type(() => Number)
  @IsInt()
  year: number;

  @IsOptional()
  @IsDateString()
  votingOpensAt?: string;

  @IsOptional()
  @IsDateString()
  votingClosesAt?: string;

  @IsOptional()
  @IsUUID()
  winnerProductId?: string;
}

export class SetWinnerDto {
  @IsUUID()
  winnerProductId: string;
}
