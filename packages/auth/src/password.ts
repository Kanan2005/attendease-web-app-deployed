import { scrypt as nodeScrypt, randomBytes, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(nodeScrypt)

const HASH_PREFIX = "scrypt"
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url")
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer

  return [HASH_PREFIX, salt, derivedKey.toString("base64url")].join("$")
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, salt, storedHash] = encodedHash.split("$")

  if (algorithm !== HASH_PREFIX || !salt || !storedHash) {
    return false
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  const storedKey = Buffer.from(storedHash, "base64url")

  if (storedKey.length !== derivedKey.length) {
    return false
  }

  return timingSafeEqual(storedKey, derivedKey)
}
