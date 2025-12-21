/**
 * Remove a label from a contact
 * Variables: CONTACT_ID (required), LABEL_ID (required)
 */

// @ts-nocheck
/* eslint-disable */

(async () => {
  try {
    const contactId = '{{CONTACT_ID}}';
    const labelId = '{{LABEL_ID}}';

    if (!contactId || contactId.includes('{{')) {
      throw new Error('CONTACT_ID is required');
    }

    if (!labelId || labelId.includes('{{')) {
      throw new Error('LABEL_ID is required');
    }

    console.log(`Removing label ${labelId} from contact ${contactId}`);

    await window.WPP.labels.addOrRemoveLabels(contactId, [labelId], 'remove');

    console.log('Label removed successfully');

    return { success: true };
  } catch (error) {
    console.error('Failed to remove label from contact:', error);
    throw error;
  }
})();
