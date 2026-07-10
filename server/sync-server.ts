// import { Server } from '@hocuspocus/server';
// import { Database } from '@hocuspocus/extension-database';
// import { PrismaClient } from '@prisma/client';
// import * as Y from 'yjs';
// import { jwtVerify } from 'jose';
// import "dotenv/config";

// const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret");

// const prisma = new PrismaClient();

// const server = new Server({
//   port: Number(process.env.PORT) || 1234,
//   onAuthenticate: async ({ token, documentName }) => {
//     try {
//       // 1. Verify the JWT token sent from the client
//       const { payload } = await jwtVerify(token, JWT_SECRET);
//       const userId = payload.id as string;

//       // 2. Query Prisma to check if this user has any role for this document
//       const permission = await prisma.documentPermission.findUnique({
//         where: {
//           documentId_userId: {
//             documentId: documentName, // The document ID is the 'name' in Hocuspocus
//             userId: userId,
//           },
//         },
//       });

//       // 3. If no permission record, reject connection
//       if (!permission) {
//         throw new Error("Access Denied");
//       }

//       // 4. Return the user info (so Hocuspocus knows who is connected)
//       return { user: { id: userId, name: payload.name } };
//     } catch (err) {
//       console.error("Auth Failed:", err);
//       throw new Error("Unauthorized");
//     }
//   },
//   extensions: [
//     new Database({
//       // 1. FETCH: When a user connects, load the history from the database
//       fetch: async ({ documentName }) => {
//         try {
//           // Grab all historical updates for this document
//           const updates = await prisma.documentUpdate.findMany({
//             where: { documentId: documentName },
//             orderBy: { version: 'asc' },
//           });

//           if (updates.length === 0) return null; // No history, start fresh

//           // Merge all the binary chunks together to recreate the live document
//           const mapped = updates.map((u: any) => new Uint8Array(u.delta));
//           return Y.mergeUpdates(mapped);
//         } catch (error) {
//           console.error("Fetch Error:", error);
//           return null;
//         }
//       },

// // 2. STORE: Continuously overwrite ONE single "live snapshot" row (Version 0)
//       store: async ({ documentName, state }) => {
//         try {
//           // 1. Look for an existing live track record for this document
//           const existingLiveState = await prisma.documentUpdate.findFirst({
//             where: {
//               documentId: documentName,
//               version: 0, // Version 0 represents the active "Live Working Document"
//             },
//           });

//           if (existingLiveState) {
//             // 2. If it exists, update it directly using its primary key 'id'
//             await prisma.documentUpdate.update({
//               where: { id: existingLiveState.id },
//               data: {
//                 delta: Buffer.from(state),
//                 createdAt: new Date(),
//               },
//             });
//           } else {
//             // 3. If it doesn't exist yet, create the baseline row
//             await prisma.documentUpdate.create({
//               data: {
//                 documentId: documentName,
//                 version: 0,
//                 delta: Buffer.from(state),
//               },
//             });
//           }

//           console.log(`⚡ Live state cached for ${documentName}`);
//         } catch (error) {
//           console.error("Sync Server Live Store Error:", error);
//         }
//       },
//     }),
//   ],
// });

// server.listen();


import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';
import { jwtVerify } from 'jose';
import "dotenv/config";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret");
const prisma = new PrismaClient();

// 1. Security Extension: Defined as a plain object
// We removed ": Extension" to prevent the TS interface error
const securityExtension = {
  name: 'security-extension',
  onUpdate: async ({ update, context }: any) => {
    // A. OOM Protection: 1MB limit
    const MAX_UPDATE_SIZE = 1024 * 1024;
    if (update.byteLength > MAX_UPDATE_SIZE) {
      console.error(`[Security] Blocked oversized update from user ${context.user?.id}`);
      throw new Error("Payload size limit exceeded");
    }

    // B. RBAC: Prevent 'VIEWER' from pushing changes
    if (context.user?.role === 'VIEWER') {
      console.warn(`[Security] Unauthorized write attempt by Viewer: ${context.user.id}`);
      throw new Error("You do not have permission to edit this document");
    }
  }
};

const server = new Server({
  port: Number(process.env.PORT) || 1234,

  onAuthenticate: async ({ token, documentName }) => {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.id as string;

      const permission = await prisma.documentPermission.findUnique({
        where: {
          documentId_userId: {
            documentId: documentName,
            userId: userId,
          },
        },
      });

      if (!permission) throw new Error("Access Denied");

      return { 
        user: { 
          id: userId, 
          name: payload.name as string,
          role: permission.role 
        } 
      };
    } catch (err) {
      console.error("Auth Failed:", err);
      throw new Error("Unauthorized");
    }
  },

  // 2. Add the extension here
  extensions: [
    securityExtension as any, // Cast as any to bypass the strict interface check
    new Database({
      fetch: async ({ documentName }) => {
        try {
          const updates = await prisma.documentUpdate.findMany({
            where: { documentId: documentName },
            orderBy: { version: 'asc' },
          });

          if (updates.length === 0) return null;
          const mapped = updates.map((u: any) => new Uint8Array(u.delta));
          return Y.mergeUpdates(mapped);
        } catch (error) {
          console.error("Fetch Error:", error);
          return null;
        }
      },

      store: async ({ documentName, state }) => {
        try {
          const existingLiveState = await prisma.documentUpdate.findFirst({
            where: { documentId: documentName, version: 0 },
          });

          if (existingLiveState) {
            await prisma.documentUpdate.update({
              where: { id: existingLiveState.id },
              data: { delta: Buffer.from(state), createdAt: new Date() },
            });
          } else {
            await prisma.documentUpdate.create({
              data: { documentId: documentName, version: 0, delta: Buffer.from(state) },
            });
          }
        } catch (error) {
          console.error("Sync Server Live Store Error:", error);
        }
      },
    }),
  ],
});

server.listen();