-- Existing users get an empty hash, which never matches any password
-- (verifyPassword rejects it). They can't log in until a password is set,
-- and no existing data is lost. The default is then dropped so every new
-- user must have a real hash.
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
