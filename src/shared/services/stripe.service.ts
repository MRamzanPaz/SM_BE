import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, {
    apiVersion: '2020-08-27',
  });

  constructor() {}

  async createStripToken(payload: any) {
    try {
      const { card_cvc, card_month, card_number, card_year } = payload;

      const createToken = await this.STRIPE.tokens.create({
        card: {
          number: card_number,
          exp_month: card_month,
          exp_year: card_year,
          cvc: card_cvc,
        },
      });

      return createToken.id;
    } catch (error) {
      return null;
    }
  }

  async stripeCharge(payload: any) {
    try {
      const { amount, token, description } = payload;

      const charge = await this.STRIPE.charges.create({
        amount: amount,
        currency: 'usd',
        source: token,
        description: description,
      });

      return charge;
    } catch (error) {
      return null;
    }
  }
}
