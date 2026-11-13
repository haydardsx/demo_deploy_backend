import 'dotenv/config';
import { createApp } from './app';

async function main() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT_INVALID');
  const app = await createApp();
  await app.listen(port, '0.0.0.0');
  console.log(JSON.stringify({ event: 'listening', port }));
}

main().catch(() => {
  console.error('APPLICATION_START_FAILED');
  process.exitCode = 1;
});
