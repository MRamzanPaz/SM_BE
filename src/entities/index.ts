/* eslint-disable prettier/prettier */

import { ActivatedESims } from './activatedEsims.entity';
import { ChoicePlans } from './choicePlans.entity';
import { Cities } from './cities.entity';
import { Countries } from './country.entity';
import { Devices } from './devices.entity';
import { EmailLogs } from './emailLogs.entity';
import { eSimPlans } from './esim_plan.entity';
import { Inventory } from './inventory.entity';
import { Logs } from './logs.entity';
import { Orders } from './order.entity';
import { OrderDetails } from './order_details.entity';
import { RefundActivities } from './refundActivity.entity';
import { Regions } from './region.entity';
import { ShopifyWebHooks } from './shopifyWebHook.entity';
import { States } from './states.entity';
import { TopUpHistory } from './topupHistory.entity';
import { Users } from './users.entity';
import { VendorsOrder } from './vendorOrders.entity';
import { Vendors } from './vendors.entity';
import { Wallet_Transaction } from './wallet_transaction.entity';
import { Wl_Account } from './wl_account.entity';
import { AssignPlanToWl } from './wl_assign_plan.entity';

const entities = [
  Users,
  Logs,
  Wl_Account,
  Vendors,
  Countries,
  States,
  Cities,
  Regions,
  Inventory,
  eSimPlans,
  AssignPlanToWl,
  Orders,
  OrderDetails,
  Wallet_Transaction,
  TopUpHistory,
  ActivatedESims,
  ShopifyWebHooks,
  EmailLogs,
  RefundActivities,
  VendorsOrder,
  Devices,
  ChoicePlans,
];

export default entities;
