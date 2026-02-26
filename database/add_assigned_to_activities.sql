-- Migration: Add assigned_to column to activities
ALTER TABLE activities ADD COLUMN assigned_to VARCHAR(255);
