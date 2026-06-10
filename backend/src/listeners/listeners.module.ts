import { Module } from '@nestjs/common';
import { AuditListener } from './audit.listener';
import { NotificationsListener } from './notifications.listener';

/**
 * Houses all event listeners. Importing this module registers them with the
 * global EventEmitter2 — services stay unaware of who reacts to their events.
 */
@Module({
  providers: [NotificationsListener, AuditListener],
})
export class ListenersModule {}
