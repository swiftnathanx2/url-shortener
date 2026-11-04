import { randomBytes } from 'node:crypto';
import { logger } from '#src/middlewares/logger.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789_-';

const makeCode = (length = 7) => {
  let bytes = randomBytes(length);
  //   logger.info(bytes);
  let code = '';

  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
    logger.info(code);
  }
  return code;
};

export default makeCode;
