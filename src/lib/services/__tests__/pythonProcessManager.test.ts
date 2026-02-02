// import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import { PythonProcessManager } from '../pythonProcessManager';
// import type { SimulatorConfig, EvaluatorConfig } from '../pythonProcessManager';

// // Mock child_process
// vi.mock('child_process', () => ({
// 	spawn: vi.fn()
// }));

// // Mock fs/promises
// vi.mock('fs/promises', () => ({
// 	readFile: vi.fn(),
// 	writeFile: vi.fn(),
// 	mkdir: vi.fn(),
// 	access: vi.fn(),
// 	watch: vi.fn().mockImplementation(async function* () {
// 		// Mock async iterator for watch
// 		yield { eventType: 'change', filename: 'test.json' };
// 	})
// }));

// // Mock fs
// vi.mock('fs', () => ({
// 	existsSync: vi.fn(),
// 	createReadStream: vi.fn()
// }));

// describe('PythonProcessManager', () => {
// 	let manager: PythonProcessManager;

// 	beforeEach(() => {
// 		manager = new PythonProcessManager('python', './interview-sim');
// 		vi.clearAllMocks();
// 	});

// 	afterEach(async () => {
// 		await manager.cleanup();
// 	});

// 	describe('startSimulation', () => {
// 		it('should create a simulation process with correct configuration', async () => {
// 			const config: SimulatorConfig = {
// 				jd: 'test_jd',
// 				resume: 'test_resume',
// 				maxTurns: 10,
// 				interviewerModel: 'test-interviewer-model',
// 				candidateModel: 'test-candidate-model',
// 				outputDir: 'data/generated/simulations',
// 				temp: false
// 			};

// 			// Mock spawn to return a mock process
// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn()
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			const result = await manager.startSimulation(config);

// 			expect(result).toMatchObject({
// 				processId: expect.stringMatching(/^sim_\d+_[a-z0-9]+$/),
// 				status: 'running',
// 				outputPath: expect.any(String)
// 			});

// 			expect(spawn).toHaveBeenCalledWith('python', [
// 				'simulator.py',
// 				'--jd', 'test_jd',
// 				'--resume', 'test_resume',
// 				'--max-turns', '10',
// 				'--interviewer-model', 'test-interviewer-model',
// 				'--candidate-model', 'test-candidate-model',
// 				'--output-dir', 'data/generated/simulations'
// 			], {
// 				cwd: './interview-sim',
// 				stdio: ['pipe', 'pipe', 'pipe']
// 			});
// 		});

// 		it('should include optional parameters when provided', async () => {
// 			const config: SimulatorConfig = {
// 				jd: 'test_jd',
// 				resume: 'test_resume',
// 				transcript: 'test_transcript',
// 				maxTurns: 10,
// 				interviewerModel: 'test-interviewer-model',
// 				candidateModel: 'test-candidate-model',
// 				outputDir: 'data/generated/simulations',
// 				temp: true,
// 				quiet: true
// 			};

// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn()
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			await manager.startSimulation(config);

// 			expect(spawn).toHaveBeenCalledWith('python', [
// 				'simulator.py',
// 				'--jd', 'test_jd',
// 				'--resume', 'test_resume',
// 				'--max-turns', '10',
// 				'--interviewer-model', 'test-interviewer-model',
// 				'--candidate-model', 'test-candidate-model',
// 				'--output-dir', 'data/generated/simulations',
// 				'--transcript', 'test_transcript',
// 				'--temp',
// 				'--quiet'
// 			], expect.any(Object));
// 		});
// 	});

// 	describe('runEvaluation', () => {
// 		it('should create an evaluation process with correct configuration', async () => {
// 			const config: EvaluatorConfig = {
// 				transcriptName: 'test_transcript',
// 				step: 'all',
// 				force: false,
// 				temp: false,
// 				stage: '1'
// 			};

// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn()
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			const result = await manager.runEvaluation(config);

// 			expect(result).toMatchObject({
// 				processId: expect.stringMatching(/^eval_\d+_[a-z0-9]+$/),
// 				status: 'running',
// 				topicPath: expect.any(String),
// 				reportPath: expect.any(String)
// 			});

// 			expect(spawn).toHaveBeenCalledWith('python', [
// 				'evaluator.py',
// 				'--name', 'test_transcript',
// 				'--step', 'all',
// 				'--stage', '1'
// 			], {
// 				cwd: './interview-sim',
// 				stdio: ['pipe', 'pipe', 'pipe']
// 			});
// 		});

// 		it('should include optional evaluation parameters', async () => {
// 			const config: EvaluatorConfig = {
// 				transcriptName: 'test_transcript',
// 				step: 'topic',
// 				force: true,
// 				temp: true,
// 				stage: '2',
// 				path: 'custom/path',
// 				jd: 'test_jd',
// 				candidate: 'test_candidate'
// 			};

// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn()
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			await manager.runEvaluation(config);

// 			expect(spawn).toHaveBeenCalledWith('python', [
// 				'evaluator.py',
// 				'--name', 'test_transcript',
// 				'--step', 'topic',
// 				'--stage', '2',
// 				'--path', 'custom/path',
// 				'--force',
// 				'--temp',
// 				'--jd', 'test_jd',
// 				'--candidate', 'test_candidate'
// 			], expect.any(Object));
// 		});
// 	});

// 	describe('getProcessStatus', () => {
// 		it('should return null for non-existent process', () => {
// 			const status = manager.getProcessStatus('non-existent');
// 			expect(status).toBeNull();
// 		});

// 		it('should return process status for existing process', async () => {
// 			const config: SimulatorConfig = {
// 				jd: 'test_jd',
// 				resume: 'test_resume',
// 				maxTurns: 10,
// 				interviewerModel: 'test-interviewer-model',
// 				candidateModel: 'test-candidate-model',
// 				outputDir: 'data/generated/simulations',
// 				temp: false
// 			};

// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn()
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			const result = await manager.startSimulation(config);
// 			const status = manager.getProcessStatus(result.processId);

// 			expect(status).toMatchObject({
// 				processId: result.processId,
// 				isRunning: true,
// 				output: [],
// 				startTime: expect.any(Date)
// 			});
// 		});
// 	});

// 	describe('killProcess', () => {
// 		it('should return false for non-existent process', async () => {
// 			const result = await manager.killProcess('non-existent');
// 			expect(result).toBe(false);
// 		});

// 		it('should kill existing process', async () => {
// 			const config: SimulatorConfig = {
// 				jd: 'test_jd',
// 				resume: 'test_resume',
// 				maxTurns: 10,
// 				interviewerModel: 'test-interviewer-model',
// 				candidateModel: 'test-candidate-model',
// 				outputDir: 'data/generated/simulations',
// 				temp: false
// 			};

// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn(),
// 				killed: false
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			const result = await manager.startSimulation(config);
// 			const killResult = await manager.killProcess(result.processId);

// 			expect(killResult).toBe(true);
// 			expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
// 		});
// 	});

// 	describe('readGeneratedFile', () => {
// 		it('should read and parse JSON files', async () => {
// 			const mockJsonContent = '{"test": "data"}';
// 			const { readFile, access } = await import('fs/promises');
			
// 			vi.mocked(access).mockResolvedValue(undefined);
// 			vi.mocked(readFile).mockResolvedValue(mockJsonContent);

// 			const result = await manager.readGeneratedFile('test.json');

// 			expect(result).toEqual({ test: 'data' });
// 			expect(readFile).toHaveBeenCalledWith(
// 				expect.stringContaining('test.json'),
// 				'utf-8'
// 			);
// 		});

// 		it('should return raw text for non-JSON files', async () => {
// 			const mockTextContent = 'plain text content';
// 			const { readFile, access } = await import('fs/promises');
			
// 			vi.mocked(access).mockResolvedValue(undefined);
// 			vi.mocked(readFile).mockResolvedValue(mockTextContent);

// 			const result = await manager.readGeneratedFile('test.txt');

// 			expect(result).toBe('plain text content');
// 		});

// 		it('should throw error for non-existent files', async () => {
// 			const { access } = await import('fs/promises');
// 			vi.mocked(access).mockRejectedValue(new Error('File not found'));

// 			await expect(manager.readGeneratedFile('non-existent.txt'))
// 				.rejects.toThrow('Failed to read file');
// 		});
// 	});

// 	describe('getAllProcessStatus', () => {
// 		it('should return empty array when no processes exist', () => {
// 			const statuses = manager.getAllProcessStatus();
// 			expect(statuses).toEqual([]);
// 		});

// 		it('should return all process statuses', async () => {
// 			const config: SimulatorConfig = {
// 				jd: 'test_jd',
// 				resume: 'test_resume',
// 				maxTurns: 10,
// 				interviewerModel: 'test-interviewer-model',
// 				candidateModel: 'test-candidate-model',
// 				outputDir: 'data/generated/simulations',
// 				temp: false
// 			};

// 			const mockProcess = {
// 				stdout: { on: vi.fn() },
// 				stderr: { on: vi.fn() },
// 				on: vi.fn(),
// 				kill: vi.fn()
// 			};

// 			const { spawn } = await import('child_process');
// 			vi.mocked(spawn).mockReturnValue(mockProcess as any);

// 			const result1 = await manager.startSimulation(config);
// 			const result2 = await manager.startSimulation(config);

// 			const statuses = manager.getAllProcessStatus();

// 			expect(statuses).toHaveLength(2);
// 			expect(statuses.map(s => s.processId)).toContain(result1.processId);
// 			expect(statuses.map(s => s.processId)).toContain(result2.processId);
// 		});
// 	});
// });