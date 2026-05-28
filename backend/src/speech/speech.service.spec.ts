import { Test, TestingModule } from '@nestjs/testing';
import { SpeechService } from './speech.service';
import { InternalServerErrorException } from '@nestjs/common';

const mockCreateTranscription = jest.fn();

jest.mock('groq-sdk', () => {
  const Groq = jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: mockCreateTranscription,
      },
    },
  }));
  return {
    __esModule: true,
    default: Groq,
    toFile: jest.fn().mockImplementation((buffer, name) => ({ buffer, name })),
  };
});

describe('SpeechService', () => {
  let service: SpeechService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeechService],
    }).compile();

    service = module.get<SpeechService>(SpeechService);
    jest.clearAllMocks();
  });

  it('transcribes audio using Groq', async () => {
    mockCreateTranscription.mockResolvedValue({ text: 'Hello world' });
    const mockFile = { buffer: Buffer.from('audio'), originalname: 'audio.webm' } as Express.Multer.File;

    const result = await service.transcribeAudio(mockFile);
    expect(result).toEqual({ text: 'Hello world' });
    expect(mockCreateTranscription).toHaveBeenCalledWith({
      file: expect.any(Object), // toFile mock returns an object
      model: 'whisper-large-v3',
    });
  });

  it('throws InternalServerErrorException on Groq failure', async () => {
    mockCreateTranscription.mockRejectedValue(new Error('Groq Error'));
    const mockFile = { buffer: Buffer.from('audio'), originalname: 'audio.webm' } as Express.Multer.File;

    await expect(service.transcribeAudio(mockFile)).rejects.toThrow(InternalServerErrorException);
  });
});
