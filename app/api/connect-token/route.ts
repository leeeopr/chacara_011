import { PluggyClient } from 'pluggy-sdk';
import { NextResponse } from 'next/server';

async function handleGenerateToken(req?: Request) {
  try {
    const clientId = process.env.CLIENT_ID || process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET || process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: 'Pluggy credentials missing. Please set CLIENT_ID and CLIENT_SECRET in your environment variables.' 
        }, 
        { status: 500 }
      );
    }

    const pluggy = new PluggyClient({
      clientId,
      clientSecret,
    });

    let itemId: string | undefined;
    let clientUserId: string | undefined;

    if (req) {
      if (req.method === 'POST') {
        try {
          const body = await req.json();
          if (body?.itemId && typeof body.itemId === 'string') {
            itemId = body.itemId;
          }
          if (body?.clientUserId && typeof body.clientUserId === 'string') {
            clientUserId = body.clientUserId;
          }
        } catch {
          // Body is optional
        }
      } else if (req.method === 'GET' && req.url) {
        try {
          const { searchParams } = new URL(req.url);
          const qItemId = searchParams.get('itemId');
          const qClientUserId = searchParams.get('clientUserId');
          if (qItemId) itemId = qItemId;
          if (qClientUserId) clientUserId = qClientUserId;
        } catch {
          // Ignore url parsing issues
        }
      }
    }

    // In pluggy-sdk: createConnectToken(itemId?: string, options?: { clientUserId?: string })
    const connectToken = await pluggy.createConnectToken(
      itemId || undefined,
      clientUserId ? { clientUserId } : undefined
    );

    return NextResponse.json({ accessToken: connectToken.accessToken });
  } catch (error: any) {
    console.error('[Pluggy Connect Token] Error creating token:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create Pluggy connect token' },
      { status: error?.status || 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleGenerateToken(req);
}

export async function POST(req: Request) {
  return handleGenerateToken(req);
}
