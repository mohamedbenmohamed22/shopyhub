import { createHash } from 'node:crypto';
import { Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { VotesService } from './votes.service';

@ApiTags('votes')
@Controller('products')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  /**
   * Cast a vote for a product. The voter is identified by an `x-voter-id`
   * header (set by the frontend, persisted in localStorage); if absent we fall
   * back to a hash of IP + user-agent so casual double-voting is still blocked.
   */
  @Post(':id/vote')
  @HttpCode(201)
  vote(@Param('id') id: string, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const headerId = req.headers['x-voter-id'] as string | undefined;
    const fingerprint =
      headerId ?? createHash('sha256').update(`${ip}|${req.headers['user-agent'] ?? ''}`).digest('hex');
    return this.votes.vote(id, fingerprint, ip);
  }
}
