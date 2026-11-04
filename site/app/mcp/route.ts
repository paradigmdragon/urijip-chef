import { env } from 'cloudflare:workers';
import { handleInventoryRequest } from '../../lib/transport.mjs';
export const dynamic = 'force-dynamic';
export const POST = (request:Request) => handleInventoryRequest(request,env.DB);
