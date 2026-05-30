import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './auth.schemas';

describe('loginSchema', () => {
  it('accepts a valid email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  const valid = { email: 'a@b.com', password: 'secret12', confirmPassword: 'secret12' };

  it('accepts a valid signup', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a password under 8 chars', () => {
    expect(signupSchema.safeParse({ ...valid, password: 'sec1', confirmPassword: 'sec1' }).success).toBe(false);
  });

  it('rejects a password without a digit', () => {
    expect(
      signupSchema.safeParse({ ...valid, password: 'password', confirmPassword: 'password' }).success,
    ).toBe(false);
  });

  it('flags mismatched confirmation on the confirmPassword path', () => {
    const res = signupSchema.safeParse({ ...valid, confirmPassword: 'different' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path).toContain('confirmPassword');
    }
  });
});
