package com.crm.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferenceUpdateRequestDTO {

    private Boolean emailNotificationsEnabled;
    private Boolean pushNotificationsEnabled;
    private Boolean leadAssignmentEnabled;
    private Boolean dealStageChangesEnabled;
    private Boolean taskRemindersEnabled;
    private Boolean teamMentionsEnabled;
    private Boolean weeklyReportsEnabled;
}
