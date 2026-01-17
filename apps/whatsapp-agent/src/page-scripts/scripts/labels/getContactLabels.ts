/**
 * Get labels for a contact
 * Variables: CONTACT_ID (required)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const contactId = '{{CONTACT_ID}}';

    if (!contactId || contactId.includes('{{')) {
      throw new Error('CONTACT_ID is required');
    }

    // Get the contact object which contains label IDs
    const contact = await window.WPP.contact.get(contactId);
    const contactLabelIds = contact.labels || [];

    if (!contactLabelIds || contactLabelIds.length === 0) {
      return [];
    }

    // Get all available labels
    const allLabels = await window.WPP.labels.getAllLabels();

    // Filter to get only the labels assigned to this contact
    const contactLabels = allLabels.filter((label) =>
      contactLabelIds.includes(label.id),
    );

    return contactLabels.map((l) => ({
      id: l.id,
      name: l.name,
      hexColor: l.hexColor,
    }));
  } catch (error) {
    console.error('Failed to get contact labels:', error);
    throw error;
  }
})();
