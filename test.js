const generateWAMessageContent = async (message, options) => {
    const hasMedia = [
        "image",
        "video",
        "audio",
        "sticker",
        "document",
    ].some((key) => hasNonNullishProperty(message, key))

    let m = {}

    if (hasNonNullishProperty(message, "contacts")) {
        const contactLen = message.contacts.contacts.length

        let contactMessage

        if (!contactLen) {
            throw new Boom("require atleast 1 contact", { statusCode: 400 })
        }

        if (contactLen === 1) {
            contactMessage = {
                contactMessage: WAProto.Message.ContactMessage.fromObject(
                    message.contacts.contacts[0]
                ),
            }
        } else {
            contactMessage = {
                contactsArrayMessage: WAProto.Message.ContactsArrayMessage.fromObject(
                    message.contacts
                ),
            }
        }

        m = contactMessage
    } else if (hasNonNullishProperty(message, "contacts")) {
        const contactLen = message.contacts.contacts.length

        let contactMessage

        if (!contactLen) {
            throw new Boom("require atleast 1 contact", { statusCode: 400 })
        }

        if (contactLen === 1) {
            contactMessage = {
                contactMessage: WAProto.Message.ContactMessage.fromObject(
                    message.contacts.contacts[0]
                ),
            }
        } else {
            contactMessage = {
                contactsArrayMessage: WAProto.Message.ContactsArrayMessage.fromObject(
                    message.contacts
                ),
            }
        }

        m = contactMessage
    } else if (hasNonNullishProperty(message, "location")) {
        let locationMessage

        if (message.live) {
            locationMessage = {
                liveLocationMessage: WAProto.Message.LiveLocationMessage.fromObject(
                    message.location
                ),
            }
        } else {
            locationMessage = {
                locationMessage: WAProto.Message.LocationMessage.fromObject(
                    message.location
                ),
            }
        }

        m = locationMessage
    } else if (hasNonNullishProperty(message, "react")) {
        if (!message.react.senderTimestampMs) {
            message.react.senderTimestampMs = Date.now()
        }

        m.reactionMessage = WAProto.Message.ReactionMessage.fromObject(
            message.react
        )
    } else if (hasNonNullishProperty(message, "delete")) {
        m.protocolMessage = {
            key: message.delete,
            type: WAProto.Message.ProtocolMessage.Type.REVOKE,
        }
    } else if (hasNonNullishProperty(message, "sharePhoneNumber")) {
        m.protocolMessage = {
            type: WAProto.Message.ProtocolMessage.Type.SHARE_PHONE_NUMBER,
        }
    } else if (hasNonNullishProperty(message, "requestPhoneNumber")) {
        m.requestPhoneNumberMessage = {}
    } else if (hasNonNullishProperty(message, "forward")) {
        m = generateForwardMessageContent(message.forward, message.force)
    } else if (hasNonNullishProperty(message, "disappearingMessagesInChat")) {
        const exp =
            typeof message.disappearingMessagesInChat === "boolean"
                ? message.disappearingMessagesInChat
                    ? WA_DEFAULT_EPHEMERAL
                    : 0
                : message.disappearingMessagesInChat
        m = prepareDisappearingMessageSettingContent(exp)
    } else if (hasNonNullishProperty(message, "groupInvite")) {
        m.groupInviteMessage = {}

        m.groupInviteMessage.inviteCode = message.groupInvite.code
        m.groupInviteMessage.inviteExpiration = message.groupInvite.expiration
        m.groupInviteMessage.caption = message.groupInvite.caption
        m.groupInviteMessage.groupJid = message.groupInvite.jid
        m.groupInviteMessage.groupName = message.groupInvite.name
        m.groupInviteMessage.contextInfo = message.contextInfo

        if (options.getProfilePicUrl) {
            const pfpUrl = await options.getProfilePicUrl(
                message.groupInvite.jid
            )
            const { thumbnail } = await generateThumbnail(pfpUrl, "image")
            m.groupInviteMessage.jpegThumbnail = thumbnail
        }
    } else if (hasNonNullishProperty(message, "adminInvite")) {
        m.newsletterAdminInviteMessage = {}

        m.newsletterAdminInviteMessage.newsletterJid = message.adminInvite.jid
        m.newsletterAdminInviteMessage.newsletterName =
            message.adminInvite.name
        m.newsletterAdminInviteMessage.caption = message.adminInvite.caption
        m.newsletterAdminInviteMessage.inviteExpiration =
            message.adminInvite.expiration
        m.newsletterAdminInviteMessage.contextInfo = message.contextInfo

        if (options.getProfilePicUrl) {
            const pfpUrl = await options.getProfilePicUrl(
                message.adminInvite.jid
            )
            const { thumbnail } = await generateThumbnail(pfpUrl, "image")
            m.newsletterAdminInviteMessage.jpegThumbnail = thumbnail
        }
    } else if (hasNonNullishProperty(message, "keep")) {
        m.keepInChatMessage = {}

        m.keepInChatMessage.key = message.keep.key
        m.keepInChatMessage.keepType = message.keep?.type || 1
        m.keepInChatMessage.timestampMs = message.keep?.time || Date.now()
    } else if (hasNonNullishProperty(message, "call")) {
        m.scheduledCallCreationMessage = {}

        m.scheduledCallCreationMessage.scheduledTimestampMs =
            message.call?.time || Date.now()
        m.scheduledCallCreationMessage.callType = message.call?.type || 1
        m.scheduledCallCreationMessage.title =
            message.call?.name || "Call Creation"
    } else if (hasNonNullishProperty(message, "paymentInvite")) {
        m.messageContextInfo = {}
        m.paymentInviteMessage = {}

        m.paymentInviteMessage.expiryTimestamp =
            message.paymentInvite?.expiry || 0
        m.paymentInviteMessage.serviceType = message.paymentInvite?.type || 2
    } else if (hasNonNullishProperty(message, "ptv")) {
        const { videoMessage } = await prepareWAMessageMedia(
            { video: message.video },
            options
        )

        m.ptvMessage = videoMessage
    } else if (hasNonNullishProperty(message, "order")) {
        m.orderMessage = WAProto.Message.OrderMessage.fromObject(message.order)
    } else if (hasNonNullishProperty(message, "product")) {
        const { imageMessage } = await prepareWAMessageMedia(
            { image: message.product.productImage },
            options
        )

        m.productMessage = WAProto.Message.ProductMessage.fromObject({
            ...message,
            product: {
                ...message.product,
                productImage: imageMessage,
            },
        })
    } else if (hasNonNullishProperty(message, "album")) {
        const imageMessages = message.album.filter((item) => "image" in item)
        const videoMessages = message.album.filter((item) => "video" in item)

        m.albumMessage = WAProto.Message.AlbumMessage.fromObject({
            expectedImageCount: imageMessages.length,
            expectedVideoCount: videoMessages.length,
        })
    } else if (hasNonNullishProperty(message, "event")) {
        m.eventMessage = WAProto.Message.EventMessage.fromObject(message.event)

        if (!message.event.startTime) {
            m.eventMessage.startTime = unixTimestampSeconds() + 86400
        }

        if (options.getCallLink && message.event.call) {
            const link = await options.getCallLink(
                message.event.call,
                m.eventMessage.startTime
            )
            m.eventMessage.joinLink = link
        }
    } else if (hasNonNullishProperty(message, "pollResult")) {
        if (!Array.isArray(message.pollResult.values)) {
            throw new Boom("Invalid pollResult values", { statusCode: 400 })
        }

        const pollResultSnapshotMessage = {
            name: message.pollResult.name,
            pollVotes: message.pollResult.values.map(
                ([optionName, optionVoteCount]) => ({
                    optionName,
                    optionVoteCount,
                })
            ),
        }

        m.pollResultSnapshotMessage = pollResultSnapshotMessage
    } else if (hasNonNullishProperty(message, "poll")) {
        if (!Array.isArray(message.poll.values)) {
            throw new Boom("Invalid poll values", { statusCode: 400 })
        }

        if (
            message.poll.selectableCount < 0 ||
            message.poll.selectableCount > message.poll.values.length
        ) {
            throw new Boom(
                `poll.selectableCount in poll should be >= 0 and <= ${message.poll.values.length}`,
                { statusCode: 400 }
            )
        }

        const pollCreationMessage = {
            name: message.poll.name,
            selectableOptionsCount: message.poll?.selectableCount || 0,
            options: message.poll.values.map((optionName) => ({ optionName })),
        }

        if (message.poll?.toAnnouncementGroup) {
            m.pollCreationMessageV2 = pollCreationMessage
        } else {
            if (message.poll.selectableCount > 0) {
                m.pollCreationMessageV3 = pollCreationMessage
            } else {
                m.pollCreationMessage = pollCreationMessage
            }
        }
    } else if (hasNonNullishProperty(message, "payment")) {
        const requestPaymentMessage = {
            amount: {
                currencyCode: message.payment?.currency || "IDR",
                offset: message.payment?.offset || 0,
                value: message.payment?.amount || 999999999,
            },
            expiryTimestamp: message.payment?.expiry || 0,
            amount1000: message.payment?.amount || 999999999 * 1000,
            currencyCodeIso4217: message.payment?.currency || "IDR",
            requestFrom: message.payment?.from || "0@s.whatsapp.net",
            noteMessage: {
                extendedTextMessage: {
                    text: message.payment?.note || "Notes",
                },
            },
            background: {
                placeholderArgb:
                    message.payment?.image?.placeholderArgb || 4278190080,
                textArgb: message.payment?.image?.textArgb || 4294967295,
                subtextArgb: message.payment?.image?.subtextArgb || 4294967295,
                type: 1,
            },
        }

        m.requestPaymentMessage = requestPaymentMessage
    } else if (hasNonNullishProperty(message, "stickerPack")) {
        const {
            stickers,
            cover,
            name,
            publisher,
            packId,
            description,
        } = message.stickerPack

        const { zip } = require("fflate")

        const stickerData = {}
        const stickerPromises = stickers.map(async (s, i) => {
            const { stream } = await getStream(s.sticker)
            const buffer = await toBuffer(stream)
            const hash = sha256(buffer).toString("base64url")
            const fileName = `${i.toString().padStart(2, "0")}_${hash}.webp`

            stickerData[fileName] = [new Uint8Array(buffer), { level: 0 }]

            return {
                fileName,
                mimetype: "image/webp",
                isAnimated: s.isAnimated || false,
                isLottie: s.isLottie || false,
                emojis: s.emojis || [],
                accessibilityLabel: s.accessibilityLabel || "",
            }
        })

        const stickerMetadata = await Promise.all(stickerPromises)

        const zipBuffer = await new Promise((resolve, reject) => {
            zip(stickerData, (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(Buffer.from(data))
                }
            })
        })

        const coverBuffer = await toBuffer((await getStream(cover)).stream)

        const [stickerPackUpload, coverUpload] = await Promise.all([
            encryptedStream(zipBuffer, "sticker-pack", {
                logger: options.logger,
                opts: options.options,
            }),
            prepareWAMessageMedia(
                { image: coverBuffer },
                { ...options, mediaTypeOverride: "image" }
            ),
        ])

        const stickerPackUploadResult = await options.upload(
            stickerPackUpload.encFilePath,
            {
                fileEncSha256B64: stickerPackUpload.fileEncSha256.toString(
                    "base64"
                ),
                mediaType: "sticker-pack",
                timeoutMs: options.mediaUploadTimeoutMs,
            }
        )

        const coverImage = coverUpload.imageMessage
        const imageDataHash = sha256(coverBuffer).toString("base64")
        const stickerPackId = packId || generateMessageID()

        m.stickerPackMessage = {
            name,
            publisher,
            stickerPackId,
            packDescription: description,
            stickerPackOrigin:
                proto.Message.StickerPackMessage.StickerPackOrigin.THIRD_PARTY,
            stickerPackSize: stickerPackUpload.fileLength,
            stickers: stickerMetadata,
            fileSha256: stickerPackUpload.fileSha256,
            fileEncSha256: stickerPackUpload.fileEncSha256,
            mediaKey: stickerPackUpload.mediaKey,
            directPath: stickerPackUploadResult.directPath,
            fileLength: stickerPackUpload.fileLength,
            mediaKeyTimestamp: unixTimestampSeconds(),
            trayIconFileName: `${stickerPackId}.png`,
            imageDataHash,
            thumbnailDirectPath: coverImage.directPath,
            thumbnailFileSha256: coverImage.fileSha256,
            thumbnailFileEncSha256: coverImage.fileEncSha256,
            thumbnailHeight: coverImage.height,
            thumbnailWidth: coverImage.width,
        }
    } else if (hasNonNullishProperty(message, "buttonReply")) {
        switch (message.type) {
            case "list":
                m.listResponseMessage = {
                    title: message.buttonReply.title,
                    description: message.buttonReply.description,
                    singleSelectReply: {
                        selectedRowId: message.buttonReply.rowId,
                    },
                    lisType:
                        proto.Message.ListResponseMessage.ListType
                            .SINGLE_SELECT,
                }
                break
            case "template":
                m.templateButtonReplyMessage = {
                    selectedDisplayText: message.buttonReply.displayText,
                    selectedId: message.buttonReply.id,
                    selectedIndex: message.buttonReply.index,
                }
                break
            case "plain":
                m.buttonsResponseMessage = {
                    selectedButtonId: message.buttonReply.id,
                    selectedDisplayText: message.buttonReply.displayText,
                    type:
                        proto.Message.ButtonsResponseMessage.Type.DISPLAY_TEXT,
                }
                break
            case "interactive":
                m.interactiveResponseMessage = {
                    body: {
                        text: message.buttonReply.displayText,
                        format:
                            proto.Message.InteractiveResponseMessage.Body.Format
                                .EXTENSIONS_1,
                    },
                    nativeFlowResponseMessage: {
                        name: message.buttonReply.nativeFlows.name,
                        paramsJson: message.buttonReply.nativeFlows.paramsJson,
                        version: message.buttonReply.nativeFlows.version,
                    },
                }
                break
        }
    } else if (hasNonNullishProperty(message, "sections")) {
        m.listMessage = {
            title: message.title,
            buttonText: message.buttonText,
            footerText: message.footer,
            description: message.text,
            sections: message.sections,
            listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
        }
    } else if (hasNonNullishProperty(message, "productList")) {
        const thumbnail = message.thumbnail
            ? await generateThumbnail(message.thumbnail, "image")
            : null

        m.listMessage = {
            title: message.title,
            buttonText: message.buttonText,
            footerText: message.footer,
            description: message.text,
            productListInfo: {
                productSections: message.productList,
                headerImage: {
                    productId: message.productList[0].products[0].productId,
                    jpegThumbnail: thumbnail?.thumbnail || null,
                },
                businessOwnerJid: message.businessOwnerJid,
            },
            listType: proto.Message.ListMessage.ListType.PRODUCT_LIST,
        }
    } else if (hasNonNullishProperty(message, "buttons")) {
        const buttonsMessage = {
            buttons: message.buttons.map((b) => ({
                ...b,
                type: proto.Message.ButtonsMessage.Button.Type.RESPONSE,
            })),
        }

        if (hasNonNullishProperty(message, "text")) {
            buttonsMessage.contentText = message.text
            buttonsMessage.headerType =
                proto.Message.ButtonsMessage.HeaderType.EMPTY
        } else {
            if (hasNonNullishProperty(message, "caption")) {
                buttonsMessage.contentText = message.caption
            }

            const type = Object.keys(m)[0].replace("Message", "").toUpperCase()

            buttonsMessage.headerType =
                proto.Message.ButtonsMessage.HeaderType[type]

            Object.assign(buttonsMessage, m)
        }

        if (hasNonNullishProperty(message, "title")) {
            buttonsMessage.text = message.title
            buttonsMessage.headerType =
                proto.Message.ButtonsMessage.HeaderType.TEXT
        }

        if (hasNonNullishProperty(message, "footer")) {
            buttonsMessage.footerText = message.footer
        }

        m = { buttonsMessage }
    } else if (hasNonNullishProperty(message, "templateButtons")) {
        const hydratedTemplate = {
            hydratedButtons: message.templateButtons,
        }

        if (hasNonNullishProperty(message, "text")) {
            hydratedTemplate.hydratedContentText = message.text
        } else {
            if (hasNonNullishProperty(message, "caption")) {
                hydratedTemplate.hydratedContentText = message.caption
            }

            Object.assign(msg, m)
        }

        if (hasNonNullishProperty(message, "footer")) {
            hydratedTemplate.hydratedFooterText = message.footer
        }

        m = { templateMessage: { hydratedTemplate } }
    } else if (hasNonNullishProperty(message, "interactiveButtons")) {
        const interactiveMessage = {
            nativeFlowMessage: {
                buttons: message.interactiveButtons,
            },
        }

        if (hasNonNullishProperty(message, "text")) {
            interactiveMessage.body = {
                text: message.text,
            }
        }

        if (hasNonNullishProperty(message, "title")) {
            interactiveMessage.header = {
                title: message.title,
                subtitle: null,
                hasMediaAttachment: false,
            }

            if (hasNonNullishProperty(message, "subtitle")) {
                interactiveMessage.header.subtitle = message.subtitle
            }
        } else {
            if (hasNonNullishProperty(message, "caption")) {
                interactiveMessage.body = {
                    text: message.caption,
                }

                interactiveMessage.header = {
                    title: null,
                    subtitle: null,
                    hasMediaAttachment: false,
                    ...Object.assign(interactiveMessage, m),
                }

                if (hasNonNullishProperty(message, "title")) {
                    interactiveMessage.header.title = message.title
                }

                if (hasNonNullishProperty(message, "subtitle")) {
                    interactiveMessage.header.subtitle = message.subtitle
                }

                if (hasNonNullishProperty(message, "hasMediaAttachment")) {
                    interactiveMessage.header.hasMediaAttachment = Boolean(
                        message.hasMediaAttachment
                    )
                }
            }
        }

        if (hasNonNullishProperty(message, "footer")) {
            interactiveMessage.footer = {
                text: message.footer,
            }
        }

        m = { interactiveMessage }
    } else if (hasNonNullishProperty(message, "shop")) {
        const interactiveMessage = {
            shopStorefrontMessage: {
                surface: message.shop.surface,
                id: message.shop.id,
            },
        }

        if (hasNonNullishProperty(message, "text")) {
            interactiveMessage.body = {
                text: message.text,
            }
        }

        if (hasNonNullishProperty(message, "title")) {
            interactiveMessage.header = {
                title: message.title,
                subtitle: null,
                hasMediaAttachment: false,
            }

            if (hasNonNullishProperty(message, "subtitle")) {
                interactiveMessage.header.subtitle = message.subtitle
            }
        } else {
            if (hasNonNullishProperty(message, "caption")) {
                interactiveMessage.body = {
                    text: message.caption,
                }

                interactiveMessage.header = {
                    title: null,
                    subtitle: null,
                    hasMediaAttachment: false,
                    ...Object.assign(interactiveMessage, m),
                }

                if (hasNonNullishProperty(message, "title")) {
                    interactiveMessage.header.title = message.title
                }

                if (hasNonNullishProperty(message, "subtitle")) {
                    interactiveMessage.header.subtitle = message.subtitle
                }

                if (hasNonNullishProperty(message, "hasMediaAttachment")) {
                    interactiveMessage.header.hasMediaAttachment = Boolean(
                        message.hasMediaAttachment
                    )
                }
            }
        }

        if (hasNonNullishProperty(message, "footer")) {
            interactiveMessage.footer = {
                text: message.footer,
            }
        }

        m = { interactiveMessage }
    } else if (hasNonNullishProperty(message, "collection")) {
        const interactiveMessage = {
            collectionMessage: {
                bizJid: message.collection.bizJid,
                id: message.collection.id,
                messageVersion: message?.collection?.version,
            },
        }

        if (hasNonNullishProperty(message, "text")) {
            interactiveMessage.body = {
                text: message.text,
            }
        }

        if (hasNonNullishProperty(message, "title")) {
            interactiveMessage.header = {
                title: message.title,
                subtitle: null,
                hasMediaAttachment: false,
            }

            if (hasNonNullishProperty(message, "subtitle")) {
                interactiveMessage.header.subtitle = message.subtitle
            }
        } else {
            if (hasNonNullishProperty(message, "caption")) {
                interactiveMessage.body = {
                    text: message.caption,
                }

                interactiveMessage.header = {
                    title: null,
                    subtitle: null,
                    hasMediaAttachment: false,
                    ...Object.assign(interactiveMessage, m),
                }

                if (hasNonNullishProperty(message, "title")) {
                    interactiveMessage.header.title = message.title
                }

                if (hasNonNullishProperty(message, "subtitle")) {
                    interactiveMessage.header.subtitle = message.subtitle
                }

                if (hasNonNullishProperty(message, "hasMediaAttachment")) {
                    interactiveMessage.header.hasMediaAttachment = Boolean(
                        message.hasMediaAttachment
                    )
                }
            }
        }

        if (hasNonNullishProperty(message, "footer")) {
            interactiveMessage.footer = {
                text: message.footer,
            }
        }

        m = { interactiveMessage }
    } else if (hasNonNullishProperty(message, "cards")) {
        const slides = await Promise.all(
            message.cards.map(async (slide) => {
                const {
                    image,
                    video,
                    product,
                    title,
                    body,
                    footer,
                    buttons,
                } = slide

                let header

                if (product) {
                    const { imageMessage } = await prepareWAMessageMedia(
                        { image: product.productImage, ...options },
                        options
                    )
                    header = {
                        productMessage: {
                            product: {
                                ...product,
                                productImage: imageMessage,
                            },
                            ...slide,
                        },
                    }
                } else if (image) {
                    header = await prepareWAMessageMedia(
                        { image: image, ...options },
                        options
                    )
                } else if (video) {
                    header = await prepareWAMessageMedia(
                        { video: video, ...options },
                        options
                    )
                }

                const msg = {
                    header: {
                        title,
                        hasMediaAttachment: true,
                        ...header,
                    },
                    body: {
                        text: body,
                    },
                    footer: {
                        text: footer,
                    },
                    nativeFlowMessage: {
                        buttons,
                    },
                }

                return msg
            })
        )

        const interactiveMessage = {
            carouselMessage: {
                cards: slides,
            },
        }

        if (hasNonNullishProperty(message, "text")) {
            interactiveMessage.body = {
                text: message.text,
            }
        }

        if (hasNonNullishProperty(message, "title")) {
            interactiveMessage.header = {
                title: message.title,
                subtitle: null,
                hasMediaAttachment: false,
            }

            if (hasNonNullishProperty(message, "subtitle")) {
                interactiveMessage.header.subtitle = message.subtitle
            }
        } else {
            if (hasNonNullishProperty(message, "caption")) {
                interactiveMessage.body = {
                    text: message.caption,
                }

                interactiveMessage.header = {
                    title: null,
                    subtitle: null,
                    hasMediaAttachment: false,
                    ...Object.assign(interactiveMessage, m),
                }

                if (hasNonNullishProperty(message, "title")) {
                    interactiveMessage.header.title = message.title
                }

                if (hasNonNullishProperty(message, "subtitle")) {
                    interactiveMessage.header.subtitle = message.subtitle
                }

                if (hasNonNullishProperty(message, "hasMediaAttachment")) {
                    interactiveMessage.header.hasMediaAttachment = Boolean(
                        message.hasMediaAttachment
                    )
                }
            }
        }

        if (hasNonNullishProperty(message, "footer")) {
            interactiveMessage.footer = {
                text: message.footer,
            }
        }

        m = { interactiveMessage }
    } else if (hasNonNullishProperty(message, "text")) {
        const extContent = { text: message.text }

        let urlInfo = message.linkPreview

        if (typeof urlInfo === "undefined") {
            urlInfo = await generateLinkPreviewIfRequired(
                message.text,
                options.getUrlInfo,
                options.logger
            )
        }

        if (urlInfo) {
            extContent.canonicalUrl = urlInfo["canonical-url"]
            extContent.matchedText = urlInfo["matched-text"]
            extContent.jpegThumbnail = urlInfo.jpegThumbnail
            extContent.description = urlInfo.description
            extContent.title = urlInfo.title
            extContent.previewType = 0

            const img = urlInfo.highQualityThumbnail

            if (img) {
                extContent.thumbnailDirectPath = img.directPath
                extContent.mediaKey = img.mediaKey
                extContent.mediaKeyTimestamp = img.mediaKeyTimestamp
                extContent.thumbnailWidth = img.width
                extContent.thumbnailHeight = img.height
                extContent.thumbnailSha256 = img.fileSha256
                extContent.thumbnailEncSha256 = img.fileEncSha256
            }
        }

        if (options.backgroundColor) {
            extContent.backgroundArgb = await assertColor(
                options.backgroundColor
            )
        }

        if (options.textColor) {
            extContent.textArgb = await assertColor(options.textColor)
        }

        if (options.font) {
            extContent.font = options.font
        }

        m.extendedTextMessage = extContent
    } else if (hasMedia) {
        m = await prepareWAMessageMedia(message, options)
    }

    if (hasOptionalProperty(message, "ephemeral")) {
        m = { ephemeralMessage: { message: m } }
    }

    if (hasOptionalProperty(message, "mentions") && message.mentions?.length) {
        const messageType = Object.keys(m)[0]
        const key = m[messageType]

        if ("contextInfo" in key && !!key.contextInfo) {
            key.contextInfo.mentionedJid = message.mentions
        } else if (key) {
            key.contextInfo = {
                mentionedJid: message.mentions,
            }
        }
    }

    if (hasOptionalProperty(message, "contextInfo") && !!message.contextInfo) {
        const messageType = Object.keys(m)[0]
        const key = m[messageType]

        if ("contextInfo" in key && !!key.contextInfo) {
            key.contextInfo = { ...key.contextInfo, ...message.contextInfo }
        } else if (key) {
            key.contextInfo = message.contextInfo
        }
    }

    if (hasOptionalProperty(message, "edit")) {
        m = {
            protocolMessage: {
                key: message.edit,
                editedMessage: m,
                timestampMs: Date.now(),
                type: WAProto.Message.ProtocolMessage.Type.MESSAGE_EDIT,
            },
        }
    }

    return WAProto.Message.fromObject(m)
}
