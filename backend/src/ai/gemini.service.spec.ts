import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { GeminiService } from './gemini.service';

const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    },
  })),
  Type: { STRING: 'STRING', OBJECT: 'OBJECT' },
}));

async function drain<T>(gen: AsyncGenerator<string, T>) {
  let out = '';
  let r = await gen.next();
  while (!r.done) {
    out += r.value;
    r = await gen.next();
  }
  return { out, value: r.value };
}

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiService],
    }).compile();
    service = module.get<GeminiService>(GeminiService);
    jest.clearAllMocks();
  });

  describe('generateJson', () => {
    it('returns parsed JSON on first-model success', async () => {
      mockGenerateContent.mockResolvedValue({ text: '{"a":1}' });
      const result = await service.generateJson<{ a: number }>('p');
      expect(result).toEqual({ a: 1 });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('strips markdown fences before parsing', async () => {
      mockGenerateContent.mockResolvedValue({ text: '```json\n{"a":1}\n```' });
      const result = await service.generateJson<{ a: number }>('p');
      expect(result).toEqual({ a: 1 });
    });

    it('throws on unparseable response', async () => {
      mockGenerateContent.mockResolvedValue({ text: 'not json' });
      await expect(service.generateJson('p')).rejects.toThrow(
        'AI returned an unparseable response. Please try again.',
      );
    });

    it('switches to the next model when one is unavailable (503/429)', async () => {
      mockGenerateContent
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce({ text: '{"ok":true}' });
      const result = await service.generateJson<{ ok: boolean }>('p');
      expect(result).toEqual({ ok: true });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('throws HttpException when every model is unavailable', async () => {
      mockGenerateContent.mockRejectedValue({ status: 503 });
      await expect(service.generateJson('p')).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    it('rethrows a non-rate-limit error immediately', async () => {
      mockGenerateContent.mockRejectedValue(new Error('boom'));
      await expect(service.generateJson('p')).rejects.toThrow('boom');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateJsonStream', () => {
    it('yields chunks and returns parsed result', async () => {
      mockGenerateContentStream.mockResolvedValue([{ text: '{"a":1}' }]);
      const { out, value } = await drain(
        service.generateJsonStream<{ a: number }>('p'),
      );
      expect(out).toBe('{"a":1}');
      expect(value).toEqual({ a: 1 });
    });

    it('rethrows a non-rate-limit error immediately', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('boom'));
      await expect(drain(service.generateJsonStream('p'))).rejects.toThrow(
        'boom',
      );
    });
  });
});
