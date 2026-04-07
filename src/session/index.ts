import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { InvestigationRequest } from "../models";

/**
 * A single investigation session, keyed by UUID.
 */
export interface Session {
  /** Unique session identifier. */
  id: string;
  /** Context provided when the investigation was created. */
  context: InvestigationRequest;
  /**
   * Full message history in Anthropic format.
   * Includes user and assistant messages so the AI has full context
   * on follow-up turns.
   */
  messages: Anthropic.MessageParam[];
  /** When this session was created. */
  createdAt: Date;
}

/** In-memory store: sessionId → Session. */
const _store = new Map<string, Session>();

/**
 * Manages investigation sessions stored in memory.
 */
export const sessionStore = {
  /**
   * Creates a new session from an investigation request.
   * The user's prompt is added as the first message.
   * @param {InvestigationRequest} context The investigation request context.
   * @returns {Session} The newly created session.
   */
  create(context: InvestigationRequest): Session {
    const id = crypto.randomUUID();
    const session: Session = {
      id,
      context,
      messages: [{ role: "user", content: context.prompt }],
      createdAt: new Date(),
    };
    _store.set(id, session);
    return session;
  },

  /**
   * Retrieves a session by ID.
   * @param {string} id The session ID.
   * @returns {Session | undefined} The session if found, otherwise undefined.
   */
  get(id: string): Session | undefined {
    return _store.get(id);
  },

  /**
   * Appends a follow-up user message to an existing session.
   * @param {string} id The session ID.
   * @param {string} content The user's follow-up message text.
   */
  appendUserMessage(id: string, content: string): void {
    const session = _store.get(id);
    if (session) {
      session.messages.push({ role: "user", content });
    }
  },
};
