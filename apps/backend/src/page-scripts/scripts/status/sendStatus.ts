/* eslint-disable no-undef */
// @ts-nocheck - Ce code s'exécute dans le navigateur, pas dans Node.js

(async () => {
  const STATUS_TYPE = '{{STATUS_TYPE}}';
  const TEXT_CONTENT = `{{TEXT_CONTENT}}`;
  const CAPTION = `{{CAPTION}}`;
  const MEDIA_URL = `{{MEDIA_URL}}`;

  const toDataUrl = async (source) => {
    if (!source) {
      throw new Error('Media source is required');
    }

    if (source.startsWith('data:')) {
      return source;
    }

    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Unable to download media (${response.status})`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read media file'));
      reader.readAsDataURL(blob);
    });
  };

  try {
    if (!window.WPP?.status) {
      throw new Error('WPP.status module is not available');
    }

    if (STATUS_TYPE === 'TEXT') {
      const content = TEXT_CONTENT.trim();

      if (!content) {
        throw new Error('Text status content is required');
      }

      const result = await WPP.status.sendTextStatus(content);

      return {
        success: true,
        contentType: STATUS_TYPE,
        statusId: result?.id || result?._serialized,
        messageId: result?.message?.id || result?.message?._serialized,
      };
    }

    const mediaData = await toDataUrl(MEDIA_URL.trim());
    const options = CAPTION.trim() ? { caption: CAPTION.trim() } : undefined;

    const result =
      STATUS_TYPE === 'VIDEO'
        ? await WPP.status.sendVideoStatus(mediaData, options)
        : await WPP.status.sendImageStatus(mediaData, options);

    return {
      success: true,
      contentType: STATUS_TYPE,
      statusId: result?.id || result?._serialized,
      messageId: result?.message?.id || result?.message?._serialized,
    };
  } catch (error) {
    return {
      success: false,
      contentType: STATUS_TYPE,
      error: error?.message || 'Unknown error while publishing status',
    };
  }
})();
