/**
 * Hemo Match - Privacy & Contact Reveal Subsystem
 *
 * Scope: Safeguards donor contact information through number masking and
 * explicit two-way contact reveal protocols.
 *
 * Note: Business logic is deferred to subsequent implementation milestones.
 */

export type ContactRevealStatus = 'masked' | 'pending_approval' | 'revealed' | 'rejected';

export interface MaskedContactRecord {
  donorId: string;
  displayName: string;
  maskedPhoneNumber: string;
  status: ContactRevealStatus;
}

export interface ContactRevealRequest {
  requestId: string;
  donorId: string;
  requesterId: string;
  purpose: string;
  requestedAt: string;
}

/**
 * Placeholder for masking raw phone numbers (e.g., +91 ••••• ••123).
 * Business logic will be implemented in the privacy milestone.
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '••••••••';
  const tail = phone.slice(-4);
  return `•••• ••${tail}`;
}

/**
 * Placeholder for processing contact reveal requests.
 * Business logic will be implemented in the privacy milestone.
 */
export async function requestContactReveal(
  _revealInput: ContactRevealRequest
): Promise<{ success: boolean; status: ContactRevealStatus }> {
  // Stubbed for initial foundation
  return {
    success: true,
    status: 'pending_approval',
  };
}
