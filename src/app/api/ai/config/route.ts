import { errorResponse, getPublicAiConfig } from '../../../../lib/server/generation.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    return Response.json(getPublicAiConfig(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
