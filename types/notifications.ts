export type NotificationType =
    | 'maintenance_update'
    | 'maintenance_created'
    | 'status_change'
    | 'notes_added'
    | 'scheduled';

export interface Notification {
    id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    maintenanceRequestId: string;
    read: boolean;
    createdAt: any;
    metadata?: {
        oldStatus?: string;
        newStatus?: string;
        adminName?: string;
        scheduledDate?: string;
    };
}

export interface NotificationPreferences {
    userId: string;
    email: {
        enabled: boolean;
        statusChanges: boolean;
        notesAdded: boolean;
        requestConfirmation: boolean;
        technicianScheduled: boolean;
    };
    push: {
        enabled: boolean;
        statusChanges: boolean;
        notesAdded: boolean;
        requestConfirmation: boolean;
        technicianScheduled: boolean;
    };
    inApp: {
        enabled: boolean;
    };
    createdAt: any;
    updatedAt: any;
}
