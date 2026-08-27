import { NextResponse } from 'next/server';
import { PluggyClient } from 'pluggy-sdk';

/**
 * Initializes the Pluggy SDK client on the server side using environment variables.
 */
function getPluggyClient(): PluggyClient | null {
  const clientId = process.env.CLIENT_ID || process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET || process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('[Pluggy Webhook] Warning: CLIENT_ID or CLIENT_SECRET missing in process.env');
    return null;
  }

  return new PluggyClient({
    clientId,
    clientSecret,
  });
}

/**
 * Handlers for webhook events.
 * Heavy/async processing is kicked off without blocking the 5-second HTTP response.
 */
async function handleItemCreated(itemId: string) {
  console.log(`[Pluggy Webhook] Handling 'item/created' for itemId: ${itemId}`);
  const pluggy = getPluggyClient();
  if (!pluggy) return;

  try {
    const item = await pluggy.fetchItem(itemId);
    console.log(`[Pluggy Webhook] Item ${itemId} status: ${item.status}, connector: ${item.connector?.name}`);
    // Here you can persist the item or trigger background sync for accounts/transactions
  } catch (error) {
    console.error(`[Pluggy Webhook] Error fetching created item ${itemId}:`, error);
  }
}

async function handleItemUpdated(itemId: string) {
  console.log(`[Pluggy Webhook] Handling 'item/updated' for itemId: ${itemId}`);
  const pluggy = getPluggyClient();
  if (!pluggy) return;

  try {
    const item = await pluggy.fetchItem(itemId);
    console.log(`[Pluggy Webhook] Item ${itemId} updated. Status: ${item.status}, executionStatus: ${item.executionStatus}`);
    
    // When an item is fully updated (OUTDATED -> UPDATED), accounts and transactions are ready to be fetched:
    if (item.status === 'UPDATED') {
      console.log(`[Pluggy Webhook] Item ${itemId} is now UPDATED. Ready to fetch accounts/transactions.`);
    }
  } catch (error) {
    console.error(`[Pluggy Webhook] Error processing item update ${itemId}:`, error);
  }
}

async function handleItemError(itemId: string, errorDetails?: any) {
  console.error(`[Pluggy Webhook] Handling 'item/error' for itemId: ${itemId}:`, errorDetails);
  // Log or update the item status to prompt the user to re-authenticate via Pluggy Connect
}

export async function POST(req: Request) {
  try {
    const event = await req.json();

    console.log('[Pluggy Webhook] Received event:', event.event, '| Event ID:', event.eventId, '| Item ID:', event.itemId);

    // Asynchronously dispatch event handlers so the endpoint responds promptly (under 5s mandate)
    (async () => {
      try {
        switch (event.event) {
          case 'item/created':
            await handleItemCreated(event.itemId);
            break;
          case 'item/updated':
            await handleItemUpdated(event.itemId);
            break;
          case 'item/error':
            await handleItemError(event.itemId, event.error);
            break;
          case 'transactions/created':
            console.log(`[Pluggy Webhook] New transactions available for item: ${event.itemId}`);
            break;
          default:
            console.log(`[Pluggy Webhook] Unhandled event type: ${event.event}`);
            break;
        }
      } catch (err) {
        console.error('[Pluggy Webhook] Background processor error:', err);
      }
    })();

    // IMPORTANT: Return 2XX immediately within 5 seconds as required by Pluggy docs
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Pluggy Webhook] Error parsing webhook payload:', error);
    return NextResponse.json({ received: true, parseError: error.message }, { status: 200 });
  }
}
