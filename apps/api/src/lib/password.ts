import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// scrypt is built into Node and is deliberately slow and memory-hungry,
// which makes guessing passwords from a stolen database very expensive.
// A random salt per user means identical passwords get different hashes.

const KEY_LENGTH = 64;
const OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 };

function derive(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Returns "scrypt$N$r$p$salt$hash". Storing the settings lets us raise them later. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, OPTIONS);
  const { N, r, p } = OPTIONS;
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, N, r, p, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  // Constant-time comparison: an attacker can't learn how many bytes matched
  // from how long the check took.
  return timingSafeEqual(actual, expected);
}
