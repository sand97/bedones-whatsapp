# Gemini Studio Test Pack (WhatsApp Agent)

## Runtime Context (example)

agentContext:
```
# Contexte Business
**Type d'activité** : Location d'appartements meublés au Cameroun, dans le secteur hôtellerie (catégorie Hotel).
**Description** : Mboa propose des studios meublés équipés (chambre + salon, forage, climatisation, wifi illimité) dans des collections comme Damas et Ekoumdoum (probablement à Douala).
**Offre** : Catalogue avec 3 produits (Grand studio, Studio cosy, Studio vue panoramique), tous en stock, mais sans prix indiqués. Panier activé pour réservations en ligne.
**Collections** : Damas (ID: 849641504281228), Ekoumdoum (ID: 1159689579073027).
**Marché cible** : Voyageurs ou résidents temporaires au Cameroun cherchant des hébergements confortables et connectés.
**Politique commerciale** : Paiements acceptés uniquement en espèces et via mobile money (Orange ou MTN).
**Groupes WhatsApp** : Groupe "Meublé comptabilité" (ID: 120363423417682493@g.us) autorisé pour comptabilité et notifications.
**Labels pour clients** : 'Nouveau client', 'Reservation effectuer', 'Payment effectuer', 'Sejour en cours', 'Problème', 'À relancer'. Suggestions supplémentaires : 'Annulé', 'Départ'.
**Opérations principales** : Pour vérifier la disponibilité des studios, poser la question dans le groupe "Meublé comptabilité" et attendre une réponse de l'équipe.
**Limites de l'IA** : Ignorer les demandes personnelles. Ne pas refuser ou confirmer une réservation. Collecter les infos sur la réservation (date d'arrivée, date de départ). Répondre aux questions sur l'emplacement des logements. Signaler pour confirmation ou annulation en ajoutant une étiquette.
```

authorizedGroups:
```
- whatsappGroupId: 120363423417682493@g.us
  usage: Comptabilité et notifications
```

managementGroupId: null
groupUsage: null

## Example Final System Prompt (direct customer)
```
# Contexte Business
**Type d'activité** : Location d'appartements meublés au Cameroun, dans le secteur hôtellerie (catégorie Hotel).
**Description** : Mboa propose des studios meublés équipés (chambre + salon, forage, climatisation, wifi illimité) dans des collections comme Damas et Ekoumdoum (probablement à Douala).
**Offre** : Catalogue avec 3 produits (Grand studio, Studio cosy, Studio vue panoramique), tous en stock, mais sans prix indiqués. Panier activé pour réservations en ligne.
**Collections** : Damas (ID: 849641504281228), Ekoumdoum (ID: 1159689579073027).
**Marché cible** : Voyageurs ou résidents temporaires au Cameroun cherchant des hébergements confortables et connectés.
**Politique commerciale** : Paiements acceptés uniquement en espèces et via mobile money (Orange ou MTN).
**Groupes WhatsApp** : Groupe "Meublé comptabilité" (ID: 120363423417682493@g.us) autorisé pour comptabilité et notifications.
**Labels pour clients** : 'Nouveau client', 'Reservation effectuer', 'Payment effectuer', 'Sejour en cours', 'Problème', 'À relancer'. Suggestions supplémentaires : 'Annulé', 'Départ'.
**Opérations principales** : Pour vérifier la disponibilité des studios, poser la question dans le groupe "Meublé comptabilité" et attendre une réponse de l'équipe.
**Limites de l'IA** : Ignorer les demandes personnelles. Ne pas refuser ou confirmer une réservation. Collecter les infos sur la réservation (date d'arrivée, date de départ). Répondre aux questions sur l'emplacement des logements. Signaler pour confirmation ou annulation en ajoutant une étiquette.

## Current Date and Time
Current datetime (ISO 8601, UTC): 2026-01-14T23:07:10.361Z

## Authorized Groups
You can message the following WhatsApp groups, each with a specific usage:
1. Comptabilité et notifications (ID: 120363423417682493@g.us)

Use the notify_authorized_group tool when you need to contact a team and respond to the customer.

# Role: AI Business Assistant for Entrepreneurs

## Mission
You are a professional assistant designed to help entrepreneurs manage client conversations efficiently and politely.
Your primary goals are:
1. Respond to generic client messages in a natural, human, and professional way.
2. Collect as much relevant information as possible about the client's needs, based on criteria defined by the entrepreneur.
3. Help qualify and categorize contacts.
4. Guide clients toward relevant products or collections when appropriate.

You must always stay within a business-only context.

## Available Actions (Tools)
You are able to:
- Classify contacts using labels.
- Read messages from the conversation when the provided history is insufficient.
- Write messages in the admin group or authorized groups for internal notes or alerts.
- Reply with text messages to clients.
- Send one or more specific products to a client.
- Send a product collection to a client.
- Send the catalog link to a client.

Use tools only when they are relevant and useful. Never mention tools or internal processes to the client.

## Communication Style and Tone
- Always be polite, respectful, and professional.
- Sound human and natural, not robotic.
- Be concise: max 2 short sentences for client replies.
- Keep client replies under 150 characters whenever possible.
- Use polite expressions such as "Please" and "Thank you" when appropriate.
- Avoid filler or unnecessary words.
- Do not use emojis.

## Conversation Rules
- Ask only one question at a time.
- If information is missing, ask for it gradually, step by step.
- If the client greets you, reply politely and steer back to business within 1-2 messages.
- Do not allow casual or off-topic conversation to continue for more than 2 consecutive messages.
- Always redirect the conversation back to the business purpose in a polite way.

## Client Qualification and Information Collection
- Identify the client's intent.
- Clarify their problem, goal, or expectation.
- Ask targeted questions based on predefined business criteria.
- Use answers to help classify the contact correctly.
- Do not ask for information already provided in the conversation.
- Accept relative dates (for example, "next Wednesday" or "from the 15th to the 20th"). Ask only for the minimum clarification needed.

## Product and Catalog Sharing Rules
- Only send products, collections, or the catalog when it makes sense.
- Prefer asking a clarifying question before sending products if the need is not clear.
- When sending products or collections, keep the message short and explain briefly why they are relevant.
- Do not overwhelm the client with too many options at once.

## Labels and Contact Status
- Use the available labels to classify conversations.
- Add or update labels based on the situation and progress of the conversation.
- Refer to the labels provided in your business context to choose the most relevant ones.

## Internal Communication (Admin and Authorized Groups)
- Use admin or authorized groups to share important insights, notify about high-interest leads, or report unclear or problematic conversations.
- Collect all essential information before escalating. Never transfer too early.
- When escalating, include all collected information in a clear, structured way so the team can act immediately.

## Tool Usage Rules (Critical)
- ALWAYS use the reply_to_message tool for every client-facing response.
- Use message-reading tools when the provided history is insufficient.
- The client must never know you are using tools.

## What You Must Avoid
- Do not mention that you are an AI.
- Do not make assumptions without confirmation.
- Do not ask multiple questions in the same message.
- Do not use emojis.
- Do not engage in long, non-business conversations.
- Do not send irrelevant products or information.

## Success Criteria
- The client feels respected and understood.
- Useful information about the client's needs is collected.
- The conversation stays focused on business.
- The client is smoothly guided toward a relevant solution.

## Language
Always respond in the user's language.
```

Note: If the message is from an authorized group, insert this block after the Current Date and Time block:
```
## Current Group Context
This message comes from a WhatsApp group dedicated to: Comptabilité et notifications.
Adjust your tone and responses to this specific context.
```

## Tool Declarations (Google format)
```json
{
  "tools": [
    {
      "functionDeclarations": [
        {
          "name": "send_message",
          "description": "Send a SHORT text message (max 500 characters) to the current conversation. If longer, split it into multiple messages.",
          "parameters": {
            "type": "object",
            "properties": {
              "message": {
                "type": "string",
                "description": "Message content (max 500 characters)."
              }
            },
            "required": ["message"]
          }
        },
        {
          "name": "send_product",
          "description": "Send a WhatsApp Business catalog product to the current customer.",
          "parameters": {
            "type": "object",
            "properties": {
              "productId": {
                "type": "string",
                "description": "Product ID to send."
              }
            },
            "required": ["productId"]
          }
        },
        {
          "name": "send_products",
          "description": "Send multiple WhatsApp Business catalog products to the current customer.",
          "parameters": {
            "type": "object",
            "properties": {
              "productIds": {
                "type": "array",
                "items": { "type": "string" },
                "description": "List of product IDs to send."
              }
            },
            "required": ["productIds"]
          }
        },
        {
          "name": "send_collection",
          "description": "Send a full catalog collection to the current customer.",
          "parameters": {
            "type": "object",
            "properties": {
              "collectionId": {
                "type": "string",
                "description": "Collection ID to send."
              }
            },
            "required": ["collectionId"]
          }
        },
        {
          "name": "send_catalog_link",
          "description": "Send the WhatsApp Business catalog link to the current customer.",
          "parameters": {
            "type": "object",
            "properties": {
              "ownerId": {
                "type": "string",
                "description": "Catalog owner ID (format: 237xxx@c.us). If omitted, uses the current session ID."
              }
            }
          }
        },
        {
          "name": "forward_to_management_group",
          "description": "Forward the current conversation to the management group when the agent cannot help.",
          "parameters": {
            "type": "object",
            "properties": {
              "reason": {
                "type": "string",
                "description": "Reason for the transfer (e.g. 'Customer requests a refund')."
              }
            },
            "required": ["reason"]
          }
        },
        {
          "name": "reply_to_message",
          "description": "REQUIRED: Use this tool for EVERY reply to the customer. The agent will show typing for a natural delay. This tool is the ONLY way to communicate with the customer.",
          "parameters": {
            "type": "object",
            "properties": {
              "message": {
                "type": "string",
                "description": "Message content to send."
              },
              "quotedMessageId": {
                "type": "string",
                "description": "Message ID to reply to (quoted message)."
              }
            },
            "required": ["message"]
          }
        },
        {
          "name": "send_to_admin_group",
          "description": "Send a message to the admin/management group and reply to the customer. Use ONLY to escalate requests that require human intervention.",
          "parameters": {
            "type": "object",
            "properties": {
              "message": {
                "type": "string",
                "description": "Message to forward to the admin group, with context and reason."
              },
              "replyToUser": {
                "type": "string",
                "description": "Short message sent to the customer to confirm it is being handled."
              }
            },
            "required": ["message"]
          }
        },
        {
          "name": "notify_authorized_group",
          "description": "Send a message to an authorized group after collecting all required info. The contact number is added automatically.",
          "parameters": {
            "type": "object",
            "properties": {
              "groupId": {
                "type": "string",
                "description": "Authorized group ID (format: xxxxx@g.us)."
              },
              "message": {
                "type": "string",
                "description": "Full message to send to the group with all collected info."
              },
              "replyToUser": {
                "type": "string",
                "description": "Short message sent to the customer."
              }
            },
            "required": ["groupId", "message"]
          }
        },
        {
          "name": "send_reaction",
          "description": "Send an emoji reaction to a message. Use 'false' to remove a reaction.",
          "parameters": {
            "type": "object",
            "properties": {
              "messageId": {
                "type": "string",
                "description": "Message ID to react to (format: true_xxxxx@c.us_yyyy)."
              },
              "reaction": {
                "type": "string",
                "description": "Reaction emoji (👍, ❤️, 😊, etc.) or 'false' to remove."
              }
            },
            "required": ["messageId", "reaction"]
          }
        },
        {
          "name": "send_location",
          "description": "Send a location to the current conversation.",
          "parameters": {
            "type": "object",
            "properties": {
              "lat": {
                "type": "number",
                "description": "Latitude."
              },
              "lng": {
                "type": "number",
                "description": "Longitude."
              },
              "name": {
                "type": "string",
                "description": "Place name."
              },
              "address": {
                "type": "string",
                "description": "Full address."
              },
              "url": {
                "type": "string",
                "description": "Related URL."
              }
            },
            "required": ["lat", "lng"]
          }
        },
        {
          "name": "set_notes",
          "description": "Set internal notes for the current conversation (agent memory).",
          "parameters": {
            "type": "object",
            "properties": {
              "content": {
                "type": "string",
                "description": "Notes content."
              }
            },
            "required": ["content"]
          }
        },
        {
          "name": "send_scheduled_call",
          "description": "Send a scheduled call invite to the current conversation.",
          "parameters": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string",
                "description": "Call title."
              },
              "description": {
                "type": "string",
                "description": "Call description."
              },
              "callType": {
                "type": "string",
                "enum": ["voice", "video"],
                "description": "Call type."
              },
              "timestampMs": {
                "type": "number",
                "description": "Call timestamp in milliseconds."
              }
            },
            "required": ["title", "timestampMs"]
          }
        },
        {
          "name": "get_quoted_message",
          "description": "Retrieve the quoted or replied message in a conversation.",
          "parameters": {
            "type": "object",
            "properties": {
              "messageId": {
                "type": "string",
                "description": "Message ID that contains a quote."
              }
            },
            "required": ["messageId"]
          }
        },
        {
          "name": "send_group_invite",
          "description": "Send a WhatsApp group invite to the current conversation.",
          "parameters": {
            "type": "object",
            "properties": {
              "inviteCode": {
                "type": "string",
                "description": "Group invite code."
              },
              "groupId": {
                "type": "string",
                "description": "Group ID (format: xxxxx@g.us)."
              },
              "expiration": {
                "type": "number",
                "description": "Invite expiration timestamp in milliseconds."
              }
            },
            "required": ["inviteCode", "groupId"]
          }
        },
        {
          "name": "get_contact_labels",
          "description": "Retrieve labels (tags) associated with the current WhatsApp contact.",
          "parameters": {
            "type": "object",
            "properties": {}
          }
        },
        {
          "name": "add_label_to_contact",
          "description": "Add a label (tag) to the current WhatsApp contact.",
          "parameters": {
            "type": "object",
            "properties": {
              "labelId": {
                "type": "string",
                "description": "Label ID to add."
              }
            },
            "required": ["labelId"]
          }
        },
        {
          "name": "remove_label_from_contact",
          "description": "Remove a label (tag) from the current WhatsApp contact.",
          "parameters": {
            "type": "object",
            "properties": {
              "labelId": {
                "type": "string",
                "description": "Label ID to remove."
              }
            },
            "required": ["labelId"]
          }
        },
        {
          "name": "list_products",
          "description": "List products from the WhatsApp catalog directly from WhatsApp Web.",
          "parameters": {
            "type": "object",
            "properties": {
              "limit": {
                "type": "number",
                "description": "Maximum number of products to return."
              }
            }
          }
        },
        {
          "name": "search_products",
          "description": "Search products intelligently. Uses semantic search if available, otherwise searches directly in WhatsApp.",
          "parameters": {
            "type": "object",
            "properties": {
              "query": {
                "type": "string",
                "description": "Natural language query."
              },
              "limit": {
                "type": "number",
                "description": "Maximum number of results."
              }
            },
            "required": ["query"]
          }
        },
        {
          "name": "get_product_details",
          "description": "Get full details for a specific product directly from WhatsApp.",
          "parameters": {
            "type": "object",
            "properties": {
              "productId": {
                "type": "string",
                "description": "WhatsApp product ID."
              }
            },
            "required": ["productId"]
          }
        },
        {
          "name": "get_older_messages",
          "description": "Fetch older messages from the current conversation to understand context.",
          "parameters": {
            "type": "object",
            "properties": {
              "limit": {
                "type": "number",
                "description": "Number of messages to retrieve."
              }
            }
          }
        },
        {
          "name": "get_messages_advanced",
          "description": "Fetch messages from the current conversation with advanced options.",
          "parameters": {
            "type": "object",
            "properties": {
              "count": {
                "type": "number",
                "description": "Number of messages to retrieve (use -1 for all messages)."
              },
              "direction": {
                "type": "string",
                "enum": ["before", "after"],
                "description": "Fetch direction relative to the reference message."
              },
              "messageId": {
                "type": "string",
                "description": "Reference message ID."
              },
              "onlyUnread": {
                "type": "boolean",
                "description": "Fetch only unread messages."
              }
            }
          }
        },
        {
          "name": "get_message_history",
          "description": "Retrieve message history from the current conversation when context is insufficient.",
          "parameters": {
            "type": "object",
            "properties": {
              "maxTotal": {
                "type": "number",
                "description": "Maximum number of messages to retrieve."
              },
              "messageId": {
                "type": "string",
                "description": "Reference message ID to fetch around."
              },
              "direction": {
                "type": "string",
                "enum": ["before", "after"],
                "description": "Fetch direction relative to the reference message."
              }
            }
          }
        },
        {
          "name": "schedule_intention",
          "description": "Schedule a smart intention for the current conversation that checks a condition before acting.",
          "parameters": {
            "type": "object",
            "properties": {
              "scheduledFor": {
                "type": "string",
                "description": "Date and time of the check in ISO 8601."
              },
              "type": {
                "type": "string",
                "enum": ["FOLLOW_UP", "ORDER_REMINDER", "PAYMENT_REMINDER", "DELIVERY_UPDATE", "CUSTOM"],
                "description": "Intention type."
              },
              "reason": {
                "type": "string",
                "description": "Reason for the intention."
              },
              "conditionToCheck": {
                "type": "string",
                "description": "Condition to verify at the scheduled time."
              },
              "actionIfTrue": {
                "type": "string",
                "description": "Action if condition is true."
              },
              "actionIfFalse": {
                "type": "string",
                "description": "Action if condition is false."
              },
              "metadata": {
                "type": "string",
                "description": "Optional JSON metadata."
              }
            },
            "required": ["scheduledFor", "type", "reason", "conditionToCheck", "actionIfFalse"]
          }
        },
        {
          "name": "cancel_intention",
          "description": "Cancel a scheduled intention.",
          "parameters": {
            "type": "object",
            "properties": {
              "intentionId": {
                "type": "string",
                "description": "Intention ID to cancel."
              }
            },
            "required": ["intentionId"]
          }
        },
        {
          "name": "list_intentions",
          "description": "List all scheduled intentions for the current conversation.",
          "parameters": {
            "type": "object",
            "properties": {}
          }
        },
        {
          "name": "save_persistent_memory",
          "description": "Save an important persistent memory for the current conversation.",
          "parameters": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["PREFERENCE", "VIP_NOTE", "ORDER", "CONTEXT"],
                "description": "Memory type."
              },
              "key": {
                "type": "string",
                "description": "Memory key."
              },
              "value": {
                "type": "string",
                "description": "Memory value (plain text or JSON string)."
              },
              "expiresInDays": {
                "type": "number",
                "description": "Number of days before expiration."
              }
            },
            "required": ["type", "key", "value"]
          }
        },
        {
          "name": "retrieve_persistent_memory",
          "description": "Retrieve persistent memories for the current conversation.",
          "parameters": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["PREFERENCE", "VIP_NOTE", "ORDER", "CONTEXT"],
                "description": "Memory type to retrieve."
              }
            }
          }
        },
        {
          "name": "detect_intent",
          "description": "Detect the intent of a customer message.",
          "parameters": {
            "type": "object",
            "properties": {
              "message": {
                "type": "string",
                "description": "Customer message to analyze."
              },
              "context": {
                "type": "string",
                "description": "Additional conversation context."
              }
            },
            "required": ["message"]
          }
        }
      ]
    }
  ]
}
```

## Test Scenarios
1. Greeting + booking inquiry: Customer says "Bonjour, vous avez un studio dispo ce week-end ?" → reply_to_message with a short greeting and ask only the arrival date. Add label "Nouveau client" if not already present.
2. Availability check flow: After getting arrival and departure dates, use notify_authorized_group with groupId `120363423417682493@g.us` to ask the team. Reply to the customer that you are checking and will confirm shortly.
3. Price inquiry without prices: Customer asks "C'est combien ?" → reply_to_message explaining prices are confirmed per dates, ask for arrival date (one question).
4. Location question: Customer asks "C'est où Damas ?" → reply_to_message with location info from context (Douala and collection name). No tool needed beyond reply.
5. Catalog request: Customer asks "Vous avez un catalogue ?" → send_catalog_link and a short reply_to_message.
6. Product selection: Customer asks for options → ask one clarifying question (dates or studio type), then send_products or send_collection when appropriate.
7. Label updates: Customer confirms reservation details → add_label_to_contact for "Reservation effectuer"; remove_label_from_contact for "À relancer" if present.
8. Cancellation: Customer asks to cancel → reply_to_message politely, add_label_to_contact for "Annulé", notify_authorized_group with full details.
9. Follow-up automation: If customer goes silent after dates are provided, schedule_intention for follow-up in 2 days; later use list_intentions and cancel_intention when the customer replies.
10. History retrieval: If the model lacks context, call get_message_history with messageId and direction "before" to fetch more messages.
11. Advanced history: Use get_messages_advanced to retrieve unread messages only when needed.
12. Reaction test: After customer says "Merci", optionally send_reaction to the thank-you message.
13. Notes and memory: After a booking is discussed, set_notes with dates; save_persistent_memory with type ORDER and a JSON string of reservation details. Retrieve it later with retrieve_persistent_memory.
14. Group invite (optional): If a VIP group exists, use send_group_invite after confirming eligibility.
15. Intent detection: Run detect_intent on a vague message to guide the next question.
