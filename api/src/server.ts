import { Server } from 'http';
import { AddressInfo } from 'net';
import { createApp } from './app';

/** Starts the API and resolves once it is listening. Used by `npm run api:start` and by the test hooks. */
export function startServer(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createApp().listen(port, () => resolve(server));
    server.once('error', reject);
  });
}

if (require.main === module) {
  const port = Number(process.env.API_PORT ?? 3000);
  startServer(port).then((server) => {
    const { port: actual } = server.address() as AddressInfo;
    console.log(`Streamhub Catalogue API listening on http://localhost:${actual}`);
  });
}
