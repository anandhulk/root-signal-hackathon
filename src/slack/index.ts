import axios from "axios";
import Logger from "../logger/app";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const APP_NAME = process.env.APP_NAME!;

/**
 * Handles sending error notifications to slack.
 */
class SlackNotify {
  /**
   * @private
   * Stores reference to singleton object.
   */
  private static _slackNotify: SlackNotify;

  /**
   * @private
   * Create a private instance.
   */
  private constructor() {}

  /**
   * @public
   * @static
   * Get the slack notify instance.
   * @returns {SlackNotify} The singleton instance object.
   */
  public static get Instance(): SlackNotify {
    return this._slackNotify || (this._slackNotify = new this());
  }

  /**
   * Send error to slack service.
   * @param {string} message The message to send.
   * @param {number} code The code to send.
   * @param {string} originalError The original error message.
   */
  async sendToWebhook(message: string, code: number, originalError: string) {
    try {
      if (!SLACK_WEBHOOK_URL) return;
      await axios.post(SLACK_WEBHOOK_URL, {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Error in App:* Root Signal API - ${APP_NAME}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Error Message:* ${message}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Error Status Code:* ${code}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Original Error Message:* ${originalError}`,
            },
          },
        ],
      });
    } catch (error) {
      Logger.logWarning(
        `SlackNotify: Error in function::sendToWebhook`,
        error as Error,
      );
    }
  }
}

/**
 * Export an instance of the slack notify.
 */
const slackNotify = SlackNotify.Instance;
export default slackNotify;
