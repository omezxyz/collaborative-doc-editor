import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';

const prisma = new PrismaClient();

const server = new Server({
  port: 1234,
  extensions: [
    new Database({
      // 1. FETCH: When a user connects, load the history from the database
      fetch: async ({ documentName }) => {
        try {
          // Grab all historical updates for this document
          const updates = await prisma.documentUpdate.findMany({
            where: { documentId: documentName },
            orderBy: { version: 'asc' },
          });

          if (updates.length === 0) return null; // No history, start fresh

          // Merge all the binary chunks together to recreate the live document
          const mapped = updates.map((u: any) => new Uint8Array(u.delta));
          return Y.mergeUpdates(mapped);
        } catch (error) {
          console.error("Fetch Error:", error);
          return null;
        }
      },

      // 2. STORE: When a user stops typing, save the new binary state
// 2. STORE: Continuously overwrite ONE single "live snapshot" row (Version 0)
      store: async ({ documentName, state }) => {
        try {
          // 1. Look for an existing live track record for this document
          const existingLiveState = await prisma.documentUpdate.findFirst({
            where: {
              documentId: documentName,
              version: 0, // Version 0 represents the active "Live Working Document"
            },
          });

          if (existingLiveState) {
            // 2. If it exists, update it directly using its primary key 'id'
            await prisma.documentUpdate.update({
              where: { id: existingLiveState.id },
              data: {
                delta: Buffer.from(state),
                createdAt: new Date(),
              },
            });
          } else {
            // 3. If it doesn't exist yet, create the baseline row
            await prisma.documentUpdate.create({
              data: {
                documentId: documentName,
                version: 0,
                delta: Buffer.from(state),
              },
            });
          }

          console.log(`⚡ Live state cached for ${documentName}`);
        } catch (error) {
          console.error("Sync Server Live Store Error:", error);
        }
      },
    }),
  ],
});

server.listen();