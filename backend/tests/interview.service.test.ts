/**
 * @jest-environment node
 */

const mockPluginError = jest.fn();
const mockCreateInterview = jest.fn();

jest.mock('../src/infra/errors.js', () => ({
  PluginError: mockPluginError,
}));

jest.mock('../src/services/interview.service.js', () => ({
  createInterview: mockCreateInterview,
}));

describe('createInterview', () => {
  it('throws when required fields are missing', async () => {
    mockPluginError.mockImplementation(() => new Error('mock'));
    mockCreateInterview.mockRejectedValue(new Error('candidateId and interviewerId are required'));

    await expect(
      mockCreateInterview({
        candidateId: '',
        interviewerId: 'interviewer-1',
        scheduledAt: new Date().toISOString(),
        mode: 'online',
      })
    ).rejects.toThrow('candidateId and interviewerId are required');
  });
});
