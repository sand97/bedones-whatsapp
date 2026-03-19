/* eslint-disable no-undef */
// @ts-nocheck - Ce code s'exécute dans le navigateur, pas dans Node.js

(async () => {
  const STATUS_TYPE = '{{STATUS_TYPE}}';
  const TEXT_CONTENT = `{{TEXT_CONTENT}}`;
  const CAPTION = `{{CAPTION}}`;
  const MEDIA_URL = `{{MEDIA_URL}}`;

  const SCRIPT_TAG = '[status/sendStatus]';
  const BASE_SEND_OPTIONS = {
    waitForAck: false,
  };

  const log = (message, details) => {
    if (details === undefined) {
      console.log(`${SCRIPT_TAG} ${message}`);
      return;
    }

    console.log(`${SCRIPT_TAG} ${message}`, details);
  };

  const toDataUrlMetadata = (value) => {
    if (!value || typeof value !== 'string' || !value.startsWith('data:')) {
      return null;
    }

    const [header, payload = ''] = value.split(',', 2);
    const mimeType = header.slice(5).split(';', 1)[0] || 'unknown';

    return {
      mimeType,
      payloadLength: payload.length,
      isBase64: header.includes(';base64'),
    };
  };

  const waitForSendResult = async (promise, context) => {
    const startedAt = Date.now();
    const heartbeat = setInterval(() => {
      log(`Still waiting for ${context} after ${Date.now() - startedAt}ms`);
    }, 5000);

    try {
      const result = await promise;
      log(`${context} resolved`, {
        elapsedMs: Date.now() - startedAt,
        resultKeys: result ? Object.keys(result) : [],
        ack: result?.ack,
        id: result?.id || result?._serialized || null,
      });
      return result;
    } finally {
      clearInterval(heartbeat);
    }
  };

  const wait = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const sendMediaStatusWithoutBrokenWait = async (
    mediaData,
    statusType,
    options,
  ) => {
    const statusTypeLower = statusType === 'VIDEO' ? 'video' : 'image';

    if (
      !window.WPP?.chat?.prepareRawMessage ||
      !window.WPP?.whatsapp?.ChatModel ||
      !window.WPP?.whatsapp?.OpaqueData ||
      !window.WPP?.whatsapp?.MediaPrep ||
      !window.WPP?.util?.convertToFile ||
      !window.WPP?.util?.createWid
    ) {
      throw new Error(
        'Required WPP internals for media status send are not available',
      );
    }

    const statusChat = new window.WPP.whatsapp.ChatModel({
      id: window.WPP.util.createWid('status@broadcast'),
    });
    const file = await window.WPP.util.convertToFile(mediaData);
    log('Converted status media to File', {
      name: file?.name || null,
      type: file?.type || null,
      size: file?.size ?? null,
    });

    const opaqueData = await window.WPP.whatsapp.OpaqueData.createFromData(
      file,
      file.type,
    );
    const prepOptions = {};
    let maxDimension;

    if (statusType === 'IMAGE') {
      maxDimension = 1600;
    } else if (statusType === 'VIDEO') {
      prepOptions.asGif = false;
    }

    const mediaPrep = window.WPP.whatsapp.MediaPrep.prepRawMedia(opaqueData, {
      ...prepOptions,
      ...(maxDimension ? { maxDimension } : {}),
    });

    let preparedMessage = await window.WPP.chat.prepareRawMessage(
      statusChat,
      {
        caption: options.caption || file.name,
        filename: file.name,
        footer: options.footer,
        isCaptionByUser: options.caption != null,
      },
      {
        ...options,
        type: statusTypeLower,
      },
    );

    if (typeof window.WPP.chat.prepareMessageButtons === 'function') {
      preparedMessage = window.WPP.chat.prepareMessageButtons(
        preparedMessage,
        options,
      );
    }

    await mediaPrep.waitForPrep();
    log('Media prep completed for custom status send', {
      preparedMessageId:
        preparedMessage?.id?.toString?.() || preparedMessage?.id || null,
      preparedMessageType: preparedMessage?.type || statusTypeLower,
    });

    const sendOptions = {
      caption: options.caption,
      footer: options.footer,
      isViewOnce: false,
      productMsgOptions: undefined,
      addEvenWhilePreparing: false,
      type: preparedMessage?.type || statusTypeLower,
    };

    const sendPromise =
      mediaPrep.sendToChat.length === 1
        ? mediaPrep.sendToChat({
            chat: statusChat,
            options: sendOptions,
          })
        : mediaPrep.sendToChat(statusChat, sendOptions);

    const handledSendPromise = sendPromise
      .then((sendResult) => ({
        state: 'resolved',
        sendResult,
      }))
      .catch((error) => ({
        state: 'rejected',
        error,
      }));

    const initialOutcome = await Promise.race([
      handledSendPromise,
      wait(1500).then(() => ({ state: 'pending' })),
    ]);

    if (initialOutcome.state === 'rejected') {
      throw initialOutcome.error;
    }

    if (initialOutcome.state === 'resolved') {
      log('Custom media status send resolved during grace period', {
        preparedMessageId:
          preparedMessage?.id?.toString?.() || preparedMessage?.id || null,
      });
    } else {
      log('Custom media status send detached after grace period', {
        preparedMessageId:
          preparedMessage?.id?.toString?.() || preparedMessage?.id || null,
      });

      handledSendPromise.then((outcome) => {
        if (outcome.state === 'resolved') {
          log('Detached media status send resolved', {
            preparedMessageId:
              preparedMessage?.id?.toString?.() || preparedMessage?.id || null,
          });
          return;
        }

        console.error(
          `${SCRIPT_TAG} Detached media status send failed`,
          outcome.error?.message || outcome.error,
          outcome.error?.stack,
        );
      });
    }

    return {
      id: preparedMessage?.id?.toString?.() || preparedMessage?.id || null,
    };
  };

  const downloadRemoteMediaAsDataUrl = async (source) => {
    if (!source) {
      throw new Error('Media source is required');
    }

    log('Resolving media source', {
      sourceType: source.startsWith('data:') ? 'inline-data-url' : 'remote-url',
      hasNodeFetch: typeof window.nodeFetch === 'function',
    });

    if (source.startsWith('data:')) {
      log('Media source already provided as data URL', toDataUrlMetadata(source));
      return source;
    }

    if (window.nodeFetch) {
      log('Downloading media through nodeFetch', {
        url: source,
      });
      const response = await window.nodeFetch(source, {
        method: 'GET',
        responseType: 'arraybuffer',
      });

      if (!response.ok) {
        throw new Error(`Unable to download media (${response.status})`);
      }

      const contentType =
        response.headers?.['content-type'] || 'application/octet-stream';

      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Unable to read media file');
      }

      const dataUrl = `data:${contentType};base64,${response.data}`;
      log('Media downloaded through nodeFetch', {
        status: response.status,
        contentType,
        payloadLength: response.data.length,
      });
      return dataUrl;
    }

    log('Downloading media through browser fetch', {
      url: source,
    });
    const response = await fetch(source, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Unable to download media (${response.status})`);
    }

    const blob = await response.blob();
    log('Browser fetch completed', {
      status: response.status,
      contentType: blob.type || 'application/octet-stream',
      size: blob.size,
    });

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        log('FileReader converted media to data URL', toDataUrlMetadata(reader.result));
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error('Unable to read media file'));
      reader.readAsDataURL(blob);
    });
  };

  try {
    log('Script started', {
      contentType: STATUS_TYPE,
      hasText: Boolean(TEXT_CONTENT.trim()),
      hasCaption: Boolean(CAPTION.trim()),
      hasMediaUrl: Boolean(MEDIA_URL.trim()),
    });

    if (!window.WPP?.status) {
      throw new Error('WPP.status module is not available');
    }

    log('WPP.status module is available');

    if (STATUS_TYPE === 'TEXT') {
      const content = TEXT_CONTENT.trim();

      if (!content) {
        throw new Error('Text status content is required');
      }

      log('Sending text status', {
        textLength: content.length,
        hasCaption: Boolean(CAPTION.trim()),
        sendOptions: BASE_SEND_OPTIONS,
      });
      const result = await waitForSendResult(
        WPP.status.sendTextStatus(content, BASE_SEND_OPTIONS),
        'text status send',
      );

      return {
        success: true,
        contentType: STATUS_TYPE,
        statusId: result?.id || result?._serialized,
        messageId: result?.message?.id || result?.message?._serialized,
      };
    }

    const mediaSource = MEDIA_URL.trim();
    if (!mediaSource) {
      throw new Error('Media URL is required');
    }

    const mediaData = await downloadRemoteMediaAsDataUrl(mediaSource);
    const mediaMetadata = toDataUrlMetadata(mediaData);
    log('Prepared media payload for status send', mediaMetadata);

    const options = CAPTION.trim()
      ? {
          ...BASE_SEND_OPTIONS,
          caption: CAPTION.trim(),
        }
      : BASE_SEND_OPTIONS;
    log('Sending media status', {
      statusType: STATUS_TYPE,
      options,
      mediaMetadata,
    });

    const result = await sendMediaStatusWithoutBrokenWait(
      mediaData,
      STATUS_TYPE,
      options,
    );

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
      stack: error?.stack,
    };
  }
})();
