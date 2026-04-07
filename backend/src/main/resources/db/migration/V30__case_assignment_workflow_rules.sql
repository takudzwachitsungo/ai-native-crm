ALTER TABLE workflow_rules
    ADD COLUMN IF NOT EXISTS auto_assign_unassigned_cases BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS auto_reassign_escalated_cases BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS prefer_account_owner BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS create_assignment_tasks BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS default_assignment_task_due_days INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS urgent_assignment_task_due_days INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS default_assignment_task_priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS urgent_assignment_task_priority VARCHAR(20) NOT NULL DEFAULT 'HIGH';
