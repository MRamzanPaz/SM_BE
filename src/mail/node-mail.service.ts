import { Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import * as nodeHBS from 'nodemailer-express-handlebars';
import { join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailLogs } from 'src/entities/emailLogs.entity';
import { Repository } from 'typeorm';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as node_mailer from 'nodemailer';
import * as hbs from 'nodemailer-express-handlebars';
import { SlackService } from 'src/shared/services/slack.service';

@Injectable()
export class NodeMailService {
  constructor(
    @InjectRepository(EmailLogs)
    private readonly _emailLog: Repository<EmailLogs>,
    private mailerService: MailerService,
    @Inject('SLACK-SERVICE') private _slack: SlackService,
  ) {}

  async sendUsageEmail(mailObj: any) {
    const { to, wl_name, message } = mailObj;

    // await this.mailerService.sendMail({
    //     to: to,
    //     subject: process.env.NODE_ENV == 'dev' ? "Sandbox (Test Email)" : 'Data Usage Notification',
    //     bcc: process.env.NODE_MAILER_BCC,
    //     template: __dirname + '/templates/usage_email',
    //     context: {
    //         message: message,
    //         wl_name: wl_name
    //     }
    // })

    const email_log = {
      from: process.env.NODE_MAILER_FROM,
      to: to,
      bcc: process.env.NODE_MAILER_BCC,
      template_name: '/templates/usage_email',
      context: JSON.stringify({
        message: message,
        wl_name: wl_name,
      }),
    };

    this._slack.smEmailLogToSlack(email_log);

    const createEmailLogs = this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendOrderEmail(emailData: any) {
    // console.log(emailData)

    await this.mailerService.sendMail({
      to: emailData.to,
      subject:
        process.env.NODE_ENV == 'dev' ? 'Sandbox (Test Email)' : 'Order Email',
      bcc: process.env.NODE_MAILER_BCC,
      template: __dirname + '/templates/order_email',
      context: {
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.email,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      },
    });

    const email_log = {
      from: process.env.NODE_MAILER_FROM,
      to: emailData.to,
      bcc: process.env.NODE_MAILER_BCC,
      template_name: '/templates/order_email',
      context: JSON.stringify({
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.email,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      }),
    };
    this._slack.smEmailLogToSlack(email_log);
    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendOrderEmailToCustomer(emailData: any) {
    // const transporter = nodemailer.createTransport({
    //     host: '',
    //     port: 465,
    //     auth: {
    //         user: process.env.NODE_MAILER_USER,
    //         pass: process.env.NODE_MAILER_PASS
    //     }
    // });

    // transporter.use('compile', nodeHBS({
    //     viewEngine: {
    //         extname: '.hbs',
    //         layoutsDir: join(__dirname, '/templates'),
    //         defaultLayout: false,
    //         partialsDir:  join(__dirname, '/templates')
    //     },
    //     viewPath: join(__dirname, '/templates'), // The directory where your email templates are located
    //     extName: '.hbs',
    // }));

    // const mailOption = {}

    // await  transporter.sendMail(mailOption);

    await this.mailerService.sendMail({
      to: emailData.to,
      subject:
        process.env.NODE_ENV == 'dev' ? 'Sandbox (Test Email)' : 'Order Email',
      bcc: emailData.from,
      from: emailData.from,
      template: __dirname + '/templates/customer_order_email',
      context: {
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.email,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      },
    });

    const email_log = {
      from: emailData.from,
      to: emailData.to,
      bcc: emailData.from,
      template_name: '/templates/customer_order_email',
      context: JSON.stringify({
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.email,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      }),
    };

    this._slack.smEmailLogToSlack(email_log);
    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendOrderEmailToTravelNetCustomer(emailData: any) {
    await this.mailerService.sendMail({
      to: emailData.to,
      subject:
        process.env.NODE_ENV == 'dev'
          ? 'Sandbox (Test Email)'
          : `“TravelNet eSIM for *${emailData.to}*”`,
      bcc: emailData.from,
      from: emailData.from,
      template: __dirname + '/templates/travelNet_order_email',
      context: {
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.to,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      },
    });

    const email_log = {
      from: emailData.from,
      to: emailData.to,
      bcc: process.env.NODE_MAILER_BCC,
      template_name: '/templates/travelNet_order_email',
      context: JSON.stringify({
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.to,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      }),
    };

    this._slack.smEmailLogToSlack(email_log);
    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendOrderEmailToViajePhoneCustomer(emailData: any) {
    console.log('transporter initialize start');
    const transporter = this.mailerService.addTransporter('ViajePhone', {
      host: 'smtp.sendgrid.net',
      port: 465,
      auth: {
        user: 'apikey',
        pass: process.env.NODE_MAILER_VIAJEPHONE_PASS,
      },
    });
    console.log('transporter initialize end');

    console.log(transporter);

    await this.mailerService.sendMail({
      transporterName: 'ViajePhone',
      to: emailData.to,
      subject:
        process.env.NODE_ENV == 'dev'
          ? 'Sandbox (Test Email)'
          : `ViajePhone eSIM for *${emailData.to}*”`,
      bcc: emailData.from,
      from: emailData.from,
      template: __dirname + '/templates/viajephone_order_email',
      context: {
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.to,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      },
    });

    const email_log = {
      from: emailData.from,
      to: emailData.to,
      bcc: emailData.from,
      template_name: '/templates/viajephone_order_email',
      context: JSON.stringify({
        customer_name: emailData.customer_name,
        order_id: emailData.order_id,
        order_date: emailData.order_date,
        iccid: emailData.iccid,
        apn: emailData.apn,
        dataRoaming: emailData.dataRoaming,
        paymentType: emailData.paymentType,
        email: emailData.to,
        packageData: emailData.packageData,
        packageValidity: emailData.packageValidity,
        planName: emailData.planName,
        payment: emailData.payment,
        iosAddress: emailData.iosAddress,
        iosURL: emailData.iosURL,
        qrCodeString: emailData.qrCodeString,
        qr_url: emailData.qr_url,
      }),
    };

    this._slack.smEmailLogToSlack(email_log);
    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendRechargeEmail(emailData: any) {
    const {
      to,
      iccid,
      plan_name,
      data,
      validity,
      price,
      customer_name,
      order_no,
    } = emailData;

    await this.mailerService.sendMail({
      to: to,
      // to: 'ahmedshafiq012@gmail.com',
      subject:
        process.env.NODE_ENV == 'dev'
          ? 'Sandbox (Test Email)'
          : 'Recharge Notification',
      bcc: process.env.NODE_MAILER_BCC,
      template: __dirname + '/templates/recharge_email',
      context: {
        iccid: iccid,
        plan_name: plan_name,
        data: data,
        validity: validity,
        price: price,
        customer_name: customer_name,
        order_no: order_no,
      },
    });

    const email_log = {
      from: process.env.NODE_MAILER_FROM,
      to: to,
      bcc: process.env.NODE_MAILER_BCC,
      template_name: '/templates/recharge_email',
      context: JSON.stringify({
        iccid: iccid,
        plan_name: plan_name,
        data: data,
        validity: validity,
        price: price,
      }),
    };

    this._slack.smEmailLogToSlack(email_log);
    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendWalletTopupEmail(emailData: any) {
    const { to, amount, name, recharge_no } = emailData;

    await this.mailerService.sendMail({
      to: to,
      subject:
        process.env.NODE_ENV == 'dev'
          ? 'Sandbox (Test Email)'
          : 'Wallet Topup Notification',
      bcc: process.env.NODE_MAILER_BCC,
      template: __dirname + '/templates/wallet_topup_email',
      context: {
        wl_name: name,
        amount: amount,
        recharge_no: recharge_no,
      },
    });

    const email_log = {
      from: process.env.NODE_MAILER_FROM,
      to: to,
      bcc: process.env.NODE_MAILER_BCC,
      template_name: '/templates/wallet_topup_email',
      context: JSON.stringify({
        wl_name: name,
        amount: amount,
        recharge_no: recharge_no,
      }),
    };

    this._slack.smEmailLogToSlack(email_log);
    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendLowbalanceNotification(emailData: any) {
    const { to, balance } = emailData;

    await this.mailerService.sendMail({
      to: to,
      subject:
        process.env.NODE_ENV == 'dev'
          ? 'Sandbox (Test Email)'
          : 'Low balance Notification',
      bcc: process.env.NODE_MAILER_BCC,
      template: __dirname + '/templates/low_wallet_balance',
      context: {
        message: `Your wallet balance is $${balance}.`,
      },
    });

    const email_log = {
      from: process.env.NODE_MAILER_FROM,
      to: to,
      bcc: process.env.NODE_MAILER_BCC,
      template_name: '/templates/low_wallet_balance',
    };

    this._slack.smEmailLogToSlack(email_log);

    const createEmailLogs = await this._emailLog.create(email_log);
    await this._emailLog.save(createEmailLogs);
  }

  async sendOTPEmail(email: string, otp: string) {
    const mailOption = {
      to: email,
      subject: 'Password Reset OTP',
      bcc: process.env.NODE_MAILER_BCC,
      template: __dirname + '/templates/otp_email.hbs',
      context: {
        message: `Your OTP for password reset is: ${otp}. This OTP will expire in 5 minutes.`,
      },
    };

    try {
      await this.mailerService.sendMail(mailOption);
    } catch (error) {
      throw new Error(`Failed to send OTP to ${email}`);
    }
  }
}
