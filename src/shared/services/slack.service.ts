import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';

@Injectable()
export class SlackService {
  constructor() {}

  async smErrorToSlack(data: any, route: string) {
    const options = {};
    const web = new WebClient(process.env.SLACK_TOKEN, options);

    const block: any = {
      text: `*System-Mandeep-Error*`,
      attachments: [
        {
          text: `ENV: *${process.env.NODE_ENV.toUpperCase()}*`,
        },
        {
          text: `*Route*: ${route}`,
        },
        {
          text: `*${data}*`,
        },
      ],
    };

    return new Promise(async (resolve, reject) => {
      const channelId = process.env.SLACK_ERROR_CHANNEL_ID;
      try {
        const resp = await web.chat.postMessage({
          ...block,
          channel: channelId,
        });
        return resolve(true);
      } catch (error) {
        console.log(error);
        return resolve(true);
      }
    });
  }

  async smServerLogToSlack(data: any, route: string) {
    const options = {};
    const web = new WebClient(process.env.SLACK_TOKEN, options);

    const block: any = {
      text: `*System-Mandeep-Sucess*`,
      attachments: [
        {
          text: `ENV: *${process.env.NODE_ENV.toUpperCase()}*`,
        },
        {
          text: `*Route*: ${route}`,
        },
        {
          text: `*Endpoint Return*: *${data}*`,
        },
      ],
    };

    return new Promise(async (resolve, reject) => {
      const channelId = process.env.SLACK_SERVER_CHANNEL_ID;
      try {
        const resp = await web.chat.postMessage({
          ...block,
          channel: channelId,
        });
        return resolve(true);
      } catch (error) {
        console.log(error);
        if (
          error.message ==
          'An API error occurred: attachment_payload_limit_exceeded'
        ) {
          this.smServerLogToSlack(
            'SLACK-MESSAGE: Data too large, we cannot show you here, but your api works fine!',
            route,
          );
        }
        return resolve(true);
      }
    });
  }

  async smEmailLogToSlack(data: any) {
    const options = {};
    const web = new WebClient(process.env.SLACK_TOKEN, options);

    const block: any = {
      text: `*System-Mandeep-Emails*`,
      attachments: [
        {
          text: `ENV: *${process.env.NODE_ENV.toUpperCase()}*`,
        },
        {
          text: `*To*: ${data?.to}`,
        },
        {
          text: `*From*: ${data?.from}`,
        },
        {
          text: `*Template*: ${data?.template_name}`,
        },
        {
          text: `*Content*: ${data.context}`,
        },
      ],
    };

    return new Promise(async (resolve, reject) => {
      const channelId = process.env.SLACK_EMAIL_CHANNEL_ID;
      try {
        const resp = await web.chat.postMessage({
          ...block,
          channel: channelId,
        });
        return resolve(true);
      } catch (error) {
        console.log(error);
        return resolve(true);
      }
    });
  }

  async smVendorsLogToSlack(data: any, request: boolean) {
    const options = {};
    const web = new WebClient(process.env.SLACK_TOKEN, options);

    const block: any = {
      text: `*System-Mandeep-Vendor*`,
      attachments: [
        {
          text: `ENV: *${process.env.NODE_ENV.toUpperCase()}*`,
        },
        {
          text: `*TYPE*: ${data.type}`,
        },
        {
          text: `*ENDPOINT*: ${data.endpoint}`,
        },
        {
          text: `*METHOD*: ${data.method}`,
        },
        {
          text: request
            ? `*BODY*: ${data.response}`
            : `*RESPONSE*: ${data.response}`,
        },
      ],
    };

    // console.log("============================",block);

    return new Promise(async (resolve, reject) => {
      const channelId = process.env.SLACK_VENDOR_CHANNEL_ID;
      try {
        const resp = await web.chat.postMessage({
          ...block,
          channel: channelId,
        });
        return resolve(true);
      } catch (error) {
        if (
          error.message ==
          'An API error occurred: attachment_payload_limit_exceeded'
        ) {
          this.smVendorsLogToSlack(
            {
              ...data,
              response:
                'SLACK-MESSAGE: Data too large, we cannot show you here, but your api works fine!',
            },
            request,
          );
        }

        console.log(error);
        return resolve(true);
      }
    });
  }
}
