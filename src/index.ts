import { FastMCP } from "fastmcp";
import { z } from "zod";
import { config } from 'dotenv';
import * as path from 'path';
const rootDir = path.join(__dirname, '../../');
config({ path: path.join(rootDir, '.env') });

const server = new FastMCP({
    name: "My Server",
    version: "1.0.0",
});

server.addTool({
    name: "add",
    description: "Add two numbers",
    parameters: z.object({
        a: z.number(),
        b: z.number(),
    }),
    execute: async (args) => {
        return String(args.a + args.b);
    },
});

server.start({
    transportType: "httpStream",
    httpStream: {
        port: 8080,
    },
});