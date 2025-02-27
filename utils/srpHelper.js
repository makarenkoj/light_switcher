import crypto from 'crypto';
import { modPow } from 'bigint-mod-arith';

// for 2FA
async function prepareSRP(passwordInfo, password) {
  const algo = passwordInfo.currentAlgo;
  const g = BigInt(algo.g);
  const p = BigInt('0x' + algo.p.toString('hex'));
  const salt1 = algo.salt1;
  const srpB = BigInt('0x' + passwordInfo.srp_B.toString('hex'));

  // Обчислюємо хеш пароля
  const passwordHash = crypto.createHash('sha256').update(password).digest();
  const xBuffer = crypto.pbkdf2Sync(passwordHash, salt1, 100000, 64, 'sha512');
  const x = BigInt('0x' + xBuffer.toString('hex'));

  // Обчислення клієнтського ключа A з модульною експоненцією
  const A = modPow(g, x, p);

  // Обчислення параметра u
  const uHash = crypto.createHash('sha256').update(Buffer.concat([
    Buffer.from(A.toString(16).padStart(512, '0'), 'hex'),
    Buffer.from(srpB.toString(16).padStart(512, '0'), 'hex')
  ])).digest();
  const u = BigInt('0x' + uHash.toString('hex'));

  // Обчислення S
  const k = BigInt(3);
  const S = modPow((srpB - k * modPow(g, x, p)), (x + u * x), p);

  // Генерація M1
  const M1 = crypto.createHash('sha256').update(Buffer.concat([
    Buffer.from(A.toString(16).padStart(512, '0'), 'hex'),
    Buffer.from(srpB.toString(16).padStart(512, '0'), 'hex'),
    Buffer.from(S.toString(16).padStart(512, '0'), 'hex')
  ])).digest();

  return {
    A: Buffer.from(A.toString(16).padStart(512, '0'), 'hex'),
    M1: Buffer.from(M1.toString('hex'), 'hex')
  };
}

export { prepareSRP };
