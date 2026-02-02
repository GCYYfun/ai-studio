/**
 * History Management Service Tests
 * 
 * Basic unit tests for history management functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryManagementService } from '../HistoryManagementService';
import type { HistoryRecord, HistoryFilter } from '../HistoryManagementService';

describe('HistoryManagementService', () => {
  let service: HistoryManagementService;

  beforeEach(() => {
    service = new HistoryManagementService();
  });

  it('should create a new instance', () => {
    expect(service).toBeDefined();
  });

  it('should determine status correctly', () => {
    // Access private method through any cast for testing
    const determineStatus = (service as any).determineStatus.bind(service);

    // Test completed status
    const completedResult = {
      sessionId: 'test',
      messages: [],
      metadata: {
        candidateName: 'Test',
        position: 'Engineer',
        startTime: new Date(),
        totalTurns: 5,
        endedByInterviewer: true,
        config: {} as any
      },
      status: 'completed' as const
    };

    const status1 = determineStatus(completedResult, undefined);
    expect(status1).toBe('completed');

    // Test error status
    const errorResult = {
      ...completedResult,
      status: 'error' as const
    };

    const status2 = determineStatus(errorResult, undefined);
    expect(status2).toBe('failed');
  });

  it('should calculate duration correctly', () => {
    // Access private method through any cast for testing
    const calculateDuration = (service as any).calculateDuration.bind(service);

    const startTime = new Date('2024-01-01T10:00:00');
    const endTime = new Date('2024-01-01T10:30:00');

    const result = {
      sessionId: 'test',
      messages: [],
      metadata: {
        candidateName: 'Test',
        position: 'Engineer',
        startTime,
        endTime,
        totalTurns: 5,
        endedByInterviewer: true,
        config: {} as any
      },
      status: 'completed' as const
    };

    const duration = calculateDuration(result);
    expect(duration).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
  });

  it('should export records to CSV format', () => {
    const mockRecords: HistoryRecord[] = [
      {
        id: 'rec1',
        candidateName: 'John Doe',
        position: 'Engineer',
        interviewDate: new Date('2024-01-01'),
        status: 'completed',
        tags: ['technical', 'senior'],
        metadata: {
          totalTurns: 10,
          duration: 1800000,
          overallRating: 8.5,
          confidence: 0.9
        }
      }
    ];

    const csv = service.exportRecords(mockRecords, 'csv');
    expect(csv).toContain('Candidate Name');
    expect(csv).toContain('John Doe');
    expect(csv).toContain('Engineer');
    expect(csv).toContain('8.5');
    expect(csv).toContain('0.9');
  });

  it('should export records to JSON format', () => {
    const mockRecords: HistoryRecord[] = [
      {
        id: 'rec1',
        candidateName: 'Jane Smith',
        position: 'Designer',
        interviewDate: new Date('2024-01-01'),
        status: 'completed',
        tags: ['creative'],
        metadata: {
          overallRating: 7.5
        }
      }
    ];

    const json = service.exportRecords(mockRecords, 'json');
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].candidateName).toBe('Jane Smith');
    expect(parsed[0].position).toBe('Designer');
  });

  it('should export records to TXT format', () => {
    const mockRecords: HistoryRecord[] = [
      {
        id: 'rec1',
        candidateName: 'Bob Johnson',
        position: 'Manager',
        interviewDate: new Date('2024-01-01'),
        status: 'completed',
        tags: ['leadership'],
        notes: 'Great candidate',
        metadata: {
          overallRating: 9.0
        }
      }
    ];

    const txt = service.exportRecords(mockRecords, 'txt');
    expect(txt).toContain('面试历史记录');
    expect(txt).toContain('Bob Johnson');
    expect(txt).toContain('Manager');
    expect(txt).toContain('Great candidate');
    expect(txt).toContain('9');
  });
});
