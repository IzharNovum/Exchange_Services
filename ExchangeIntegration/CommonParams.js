import ExchangeModel from "../Database/models/Exchange.js";
import PairModel from "../Database/models/Pair.js";
import UserBots from "../Database/models/Userbots.js";
import UserExchange from "../Database/models/UserExchange.js";
import ExchangePairModel from "../Database/models/Exchange_Pair.js";


class commonParam{
    static async From(){
        const from =  await PairModel.findOne({
            attributes: ['from'],
            raw: true
        });
        return from.from;
    };

    static async To(){
        const to = await PairModel.findOne({
            attributes: ['to'],
            raw: true
        });
        return to.to;
    };

    static async accountid(){
        const account = await UserExchange.findOne({
            attributes: ['account'],
            raw: true
        });
        return account.account;
    };

    static async Price(){
        const price = await UserBots.findOne({
            attributes: ['initial_fund'],
            raw: true
        });
        return price.initial_fund;
    };
    
    static async Qty(){
        const quantity = await ExchangePairModel.findOne({
            attributes: ['min_quantity'],
            raw: true
        });
        return quantity.min_quantity;
    };

    static async OrderType(){
        const order = await UserBots.findOne({
            attributes: ['order_type'],
            raw: true
        });

        return order.order_type;
    };

    static async timeinforce() {
        const id = await UserExchange.findOne({
            attributes: ['Timeinforce'],
            raw: true
        });
        return id.Timeinforce;
    }

    static async cliendID() {
        const id = await UserExchange.findOne({
            attributes: ['Clientorderid'],
            raw: true
        });
        return id.Clientorderid;
    }

    static async Leverage() {
        const id = await UserExchange.findOne({
            attributes: ['Leverage'],
            raw: true
        });
        return id.Leverage;
    }


    static async accUUID() {
        const id = await UserExchange.findOne({
            attributes: ['Accntuuid'],
            raw: true
        });
        return id.Accntuuid;
    }

    static async Tdmode() {
        const id = await UserExchange.findOne({
            attributes: ['TdMode'],
            raw: true
        });
        return id.TdMode;
    }

    static async marginCoin() {
        const id = await UserExchange.findOne({
            attributes: ['Margincoin'],
            raw: true
        });
        return id.Margincoin;
    }


    static async marginMode() {
        const id = await UserExchange.findOne({
            attributes: ['Marginmode'],
            raw: true
        });
        return id.Marginmode;
    }

    static async IDR() {
        const id = await UserExchange.findOne({
            attributes: ['Idr'],
            raw: true
        });
        return id.Idr;
    }
    
}
    
export default commonParam;
    