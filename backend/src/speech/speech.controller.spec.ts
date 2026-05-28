import { Test, TestingModule } from '@nestjs/testing';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { BadRequestException } from '@nestjs/common';

describe('SpeechController', () => {
  let controller: SpeechController;
  const mockSpeechService = {
    transcribeAudio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpeechController],
      providers: [{ provide: SpeechService, useValue: mockSpeechService }],
    }).compile();

    controller = module.get<SpeechController>(SpeechController);
    jest.clearAllMocks();
  });

  it('calls service with file', async () => {
    mockSpeechService.transcribeAudio.mockResolvedValue({ text: 'Test' });
    const mockFile = { buffer: Buffer.from('audio') } as Express.Multer.File;

    const result = await controller.transcribe(mockFile);
    expect(result).toEqual({ text: 'Test' });
    expect(mockSpeechService.transcribeAudio).toHaveBeenCalledWith(mockFile);
  });

  it('throws BadRequestException if no file provided', async () => {
    await expect(controller.transcribe(undefined)).rejects.toThrow(BadRequestException);
  });
});
