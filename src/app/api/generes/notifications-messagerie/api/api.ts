export * from './groupMessaging.service';
import { GroupMessagingService } from './groupMessaging.service';
export * from './notifications.service';
import { NotificationsService } from './notifications.service';
export * from './privateMessaging.service';
import { PrivateMessagingService } from './privateMessaging.service';
export const APIS = [GroupMessagingService, NotificationsService, PrivateMessagingService];
